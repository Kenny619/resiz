import path from "node:path";
import fsp from "node:fs/promises";
import { Worker, isMainThread, workerData, parentPort } from "node:worker_threads";
import sharp from "sharp";
import type { FormatEnum } from "sharp";
import { fileURLToPath } from "node:url";

type inputOptions = {
	source: string;
	destination?: string;
	width?: number;
	height?: number;
	quality?: number;
	format?: string;
};

class Resiz {
	#source: string;
	#srcFile: string;
	#srcDir: string;
	#srcFiles: string[];
	#dstDir: string;
	#formats: string[];
	#newWidth: number | null;
	#newHeight: number | null;
	#outputFormat: string;
	#quality: number;

	constructor() {
		this.#newWidth = null;
		this.#newHeight = null;
		this.#source = "";
		this.#dstDir = "";
		this.#outputFormat = ".jpg";
		this.#quality = 100;
		//default values
		this.#srcFile = "";
		this.#srcFiles = [];
		this.#srcDir = "";
		//sharp compatible formats
		this.#formats = [
			".jpg",
			".jpeg",
			".png",
			".webp",
			".gif",
			".jp2",
			".tiff",
			".avif",
			".heif",
			".jxl",
			".raw",
			".tile"
		];
	}

	async run(option: inputOptions) {
		if ("width" in option && typeof option.width === "number") this.#newWidth = option.width;
		if ("height" in option && typeof option.height === "number") this.#newHeight = option.height;
		if ("source" in option && typeof option.source === "string") this.#source = option.source;
		if ("destination" in option && typeof option.destination === "string") this.#dstDir = option.destination;
		if ("quality" in option && typeof option.quality === "number") this.#quality = option.quality;
		if ("format" in option && typeof option.format === "string" && this.#formats.includes(`.${option.format}`))
			this.#outputFormat = option.format;

		try {
			await this.#validateInputs();
		} catch (e) {
			throw `${e}`;
		}

		try {
			//const workers = this.#srcFiles.map((file) => this.workerWrapper(file));
			const workers = this.#srcFiles.map((file) => this.resizeSingleFile(file));
			await Promise.all(workers).then(() => console.log("done"));
		} catch (e) {
			throw `${e}`;
		}
	}

	async #validateInputs(): Promise<void> {
		//validate and set source
		if (!this.#source) throw new Error("Specify the source fle or directory.");

		//set srcFile/srcDir
		try {
			const stat = await fsp.stat(path.resolve(process.cwd(), this.#source));
			if (stat.isFile()) await this.#setSrcFile();
			else if (stat.isDirectory()) await this.#setSrcDir();
		} catch (e) {
			throw new Error(`Failed to set source.  ${e}`);
		}

		//validate quality
		if (this.#quality < 0 || this.#quality >= 100) throw new Error(`Invalid quality: ${this.#quality}`);

		//set destination
		try {
			await this.#setDstDir();
		} catch (e) {
			throw new Error(`Failed to set destination.  ${e}`);
		}
	}

	//check if the passed file path is valid
	//throw an error if the path is not valid, or the file is not an image file
	async #setSrcFile(): Promise<void> {
		//check if the image file is compatible with Sharp
		const stat = await fsp.stat(this.#source);
		if (!this.#formats.includes(path.extname(this.#source)) || !stat.isFile())
			throw new Error(`${this.#source} is not a compatible image file.`);

		//set absolute path
		this.#srcFile = path.resolve(process.cwd(), this.#source);
		this.#srcFiles.push(this.#srcFile);
	}

	//check if the passed directory path is valid
	//throw an error if the path is not valid, or there's no file in the directory
	async #setSrcDir(): Promise<void> {
		try {
			const dirent = await fsp.readdir(this.#source, {
				withFileTypes: true,
				recursive: true
			});

			this.#srcFiles = dirent
				.filter((d) => d.isFile() && this.#formats.includes(path.extname(d.name)))
				.map((d) => path.resolve(process.cwd(), path.join(d.parentPath, d.name)));

			if (this.#srcFiles.length === 0) {
				throw new Error(`source directory: ${this.#source} does not contain any compatible image file.`);
			}
		} catch (e) {
			throw new Error(`Failed to read files in dir: ${this.#source}.  ${e}`);
		}

		//set absolute path
		this.#srcDir = path.resolve(process.cwd(), this.#source);
	}

	async #setDstDir(): Promise<void> {
		if (!this.#dstDir) {
			//set #dstDir if destination was not passed as an argument
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, "0");
			const day = String(now.getDate()).padStart(2, "0");
			const hours = String(now.getHours()).padStart(2, "0");
			const minutes = String(now.getMinutes()).padStart(2, "0");
			const seconds = String(now.getSeconds()).padStart(2, "0");

			const dirName = `resized_${year}${month}${day}${hours}${minutes}${seconds}`;
			if (this.#srcFile) this.#dstDir = path.join(path.dirname(this.#srcFile), "..", dirName);
			if (this.#srcDir) this.#dstDir = path.join(this.#srcDir, "..", dirName);
		}

		try {
			await fsp.mkdir(this.#dstDir, { recursive: true });
			const tempFilePath = path.join(this.#dstDir, ".isDstDirWritable__test");
			await fsp.writeFile(tempFilePath, "");
			await fsp.rm(tempFilePath); // Clean up the temporary file
		} catch (e) {
			//ignore error if fs couldn't locate the file.  throw error only when the error is other than ENOENT.
			//if (!/ENOENT|EPERM/.test((e as Error).message)) throw new Error(`Write test failed in ${this.#dstDir}.  ${e}`);
			throw new Error(`Failed to set ${this.#dstDir} as a destination directory.  ${e}`);
		}
	}

	async workerWrapper(file: string): Promise<void> {
		const __filename = fileURLToPath(import.meta.url);

		const workerData = {
			file,
			outputFormat: this.#outputFormat,
			quality: this.#quality,
			dstDir: this.#dstDir,
			newWidth: this.#newWidth,
			newHeight: this.#newHeight
		};

		return new Promise((resolve, reject) => {
			if (isMainThread) {
				const worker = new Worker(__filename, { workerData });

				worker.on("message", (message) => {
					console.log(message);
					resolve(message);
				}); // Resolve promise when done
				worker.on("error", (error) => {
					console.log(error);
					reject(error);
				}); // Reject promise on error
				worker.on("exit", (code) => {
					if (code !== 0) {
						reject(new Error(`Worker stopped with exit code ${code}`));
					} else {
						resolve();
					}
				});
			} else {
				try {
					this.resizeSingleFile(workerData.file).then(() => {
						console.log(`working on  ${workerData.file}`);
						parentPort?.postMessage(`Resized ${workerData}`);
					});
				} catch (e) {
					parentPort?.postMessage(`Failed to resize ${workerData.file}.  ${e}`);
				} finally {
					process.exit(0);
				}
			}
		});
	}

	async resizeSingleFile(filePath: string): Promise<void> {
		//initialize sharp instance
		//const { outputFormat, quality, dstDir, newWidth, newHeight } = workerData;
		const outputFormat = this.#outputFormat;
		const quality = this.#quality;
		const dstDir = this.#dstDir;
		const newWidth = this.#newWidth;
		const newHeight = this.#newHeight;
		const sharpInstance = sharp(filePath);
		//set new dimension

		let metadata: sharp.Metadata;
		try {
			metadata = await sharpInstance.metadata();
		} catch (e) {
			throw new Error(`Failed to acquire image dimensions.  ${e}`);
		}

		//throw an error if failed to acquire width and height of original image file
		if (!metadata.width || !metadata.height) {
			throw new Error(`${filePath} is not a valid image file.  Unable to acquire image dimensions.`);
		}
		const curWidth = metadata.width;
		const curHeight = metadata.height;
		const aRatio = curWidth / curHeight;
		let outputWidth = curWidth;
		let outputHeight = curHeight;

		//if both new width and height are set, return the new width and height
		if (newWidth !== null && newHeight !== null) {
			outputWidth = newWidth;
			outputHeight = newHeight;
		}
		//if the new width and height are not set,
		//set the new width and height to the original width and height
		if (newWidth === null && newHeight === null) {
			outputWidth = curWidth;
			outputHeight = curHeight;
		}

		//if the new width is set, but new height was not provided,
		//calculate the new height based on the original height and width
		if (newWidth === null && newHeight !== null) {
			outputWidth = ~~Math.trunc(newHeight * aRatio);
			outputHeight = newHeight;
		}

		//if the new height is set, but new width was not provided,
		//calculate the new width based on the original height and width
		if (newWidth !== null && newHeight === null) {
			outputWidth = newWidth;
			outputHeight = ~~Math.trunc(newWidth / aRatio);
		}

		//set new filename
		const filename = `${path.basename(filePath, path.extname(filePath))}.${outputFormat}`;

		let outputInstance: sharp.Sharp;

		switch (outputFormat) {
			case "jpg":
				outputInstance = sharpInstance.clone().jpeg({ quality, mozjpeg: true });
				break;
			case "jpeg":
				outputInstance = sharpInstance.clone().jpeg({ quality, mozjpeg: true });
				break;
			case "png":
				outputInstance = sharpInstance.clone().png({ quality });
				break;
			case "webp":
				outputInstance = sharpInstance.clone().webp({ quality });
				break;
			case "gif":
				outputInstance = sharpInstance.clone().gif();
				break;
			case "jp2":
				outputInstance = sharpInstance.clone().jp2({ quality });
				break;
			case "tiff":
				outputInstance = sharpInstance.clone().tiff({ quality });
				break;
			case "avif":
				outputInstance = sharpInstance.clone().avif({ quality });
				break;
			case "heif":
				outputInstance = sharpInstance.clone().heif({ quality });
				break;
			case "jxl":
				outputInstance = sharpInstance.clone().jxl({ quality });
				break;
			case "raw":
				outputInstance = sharpInstance.clone().raw();
				break;
			case "tile":
				outputInstance = sharpInstance.clone().tile();
				break;
			default:
				outputInstance = sharpInstance.clone().jpeg({ quality, mozjpeg: true });
				break;
		}

		console.log(`${filePath} ---> ${outputWidth}x${outputHeight}`);
		outputInstance
			.resize(outputWidth, outputHeight, {
				kernel: sharp.kernel.lanczos3,
				fit: sharp.fit.cover,
				position: sharp.strategy.attention
			})
			.toFormat(outputFormat as keyof FormatEnum)
			.toFile(path.join(dstDir as string, filename));
	}
}

const resiz = new Resiz();
export default resiz;
