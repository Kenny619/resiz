import fsp from "node:fs/promises";
import path from "node:path";
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
	outputFormat?: string;
};

class ImgL {
	#srcFile: string;
	#srcDir: string;
	#srcFiles: string[];
	#dstDir: string;
	#compatibleFormats: string[];
	#newWidth: number | null;
	#newHeight: number | null;
	#outputFormat: string;
	#quality: number;

	//fail-safe default values
	#defaultOutputFormat: string;

	constructor() {
		this.#newWidth = null;
		this.#newHeight = null;
		this.#srcFile = "";
		this.#srcFiles = [];
		this.#srcDir = "";
		this.#dstDir = "";
		this.#outputFormat = "";
		this.#quality = 100;
		//default values
		this.#defaultOutputFormat = "jpg";

		//sharp compatible formats
		this.#compatibleFormats = [
			"jpeg",
			"jpg",
			"png",
			"webp",
			"gif",
			"jp2",
			"tiff",
			"avif",
			"heif",
			"jxl",
			"raw",
			"tile"
		];
	}

	async resize(option: inputOptions) {
		await this.#validateInputOptions(option);

		if (this.#srcFile) {
			await this.#resizeSingleFile(this.#srcFile);
		}

		if (this.#srcDir) {
			const workers = this.#srcFiles.map((file) => this.#workerWrapper(file));
			await Promise.all(workers);
		}
	}

	async #validateInputOptions(option: inputOptions): Promise<void> {
		const { source, destination, width, height, outputFormat } = option;

		//validate and set source
		if (!source) throw new Error("Specify the source fle or directory.");

		try {
			const stat = await fsp.stat(source);
			if (stat.isFile()) await this.#checkSrcFile(source);
			if (stat.isDirectory()) await this.#checkSrcDir(source);
		} catch (e) {
			throw `${e}`;
		}

		//set quality
		if (option.quality) this.#quality = option.quality;

		//set width and height
		if (width) this.#newWidth = width;
		if (height) this.#newHeight = height;
		//set output format
		this.#setOutputFormat(outputFormat);
		//set destination
		await this.#setDstDir(source, destination);
	}

	async #workerWrapper(file: string): Promise<void> {
		const __filename = fileURLToPath(import.meta.url);

		return new Promise((resolve, reject) => {
			if (isMainThread) {
				const worker = new Worker(__filename, { workerData: file });

				worker.on("message", resolve); // Resolve promise when done
				worker.on("error", reject); // Reject promise on error
				worker.on("exit", (code) => {
					if (code !== 0) {
						reject(new Error(`Worker stopped with exit code ${code}`));
					}
				});
			} else {
				this.#resizeSingleFile(workerData);
				parentPort?.postMessage(` \"${workerData}\".`);
			}
		});
	}

	async #resizeSingleFile(filePath: string): Promise<sharp.OutputInfo> {
		//initialize sharp instance
		const sharpInstance = sharp(filePath);
		//set new dimension
		const metadata = await sharpInstance.metadata();

		//throw an error if failed to acquire width and height of original image file
		if (!metadata.width || !metadata.height) {
			throw new Error(
				`${filePath} is not a valid image file.  Unable to acquire image dimensions.`
			);
		}
		const newDimension = this.#setNewDimension(metadata.width as number, metadata.height as number);

		//set new filename
		const filename = `${path.basename(filePath, path.extname(filePath))}.${this.#outputFormat}`;

		let outputInstance: sharp.Sharp;

		switch (this.#outputFormat) {
			case "jpg":
				outputInstance = sharpInstance.clone().jpeg({ quality: this.#quality, mozjpeg: true });
				break;
			case "jpeg":
				outputInstance = sharpInstance.clone().jpeg({ quality: this.#quality, mozjpeg: true });
				break;
			case "png":
				outputInstance = sharpInstance.clone().png({ quality: this.#quality });
				break;
			case "webp":
				outputInstance = sharpInstance.clone().webp({ quality: this.#quality });
				break;
			case "gif":
				outputInstance = sharpInstance.clone().gif();
				break;
			case "jp2":
				outputInstance = sharpInstance.clone().jp2({ quality: this.#quality });
				break;
			case "tiff":
				outputInstance = sharpInstance.clone().tiff({ quality: this.#quality });
				break;
			case "avif":
				outputInstance = sharpInstance.clone().avif({ quality: this.#quality });
				break;
			case "heif":
				outputInstance = sharpInstance.clone().heif({ quality: this.#quality });
				break;
			case "jxl":
				outputInstance = sharpInstance.clone().jxl({ quality: this.#quality });
				break;
			case "raw":
				outputInstance = sharpInstance.clone().raw();
				break;
			case "tile":
				outputInstance = sharpInstance.clone().tile();
				break;
			default:
				outputInstance = sharpInstance.clone().jpeg({ quality: this.#quality, mozjpeg: true });
				break;
		}

		return outputInstance
			.resize(newDimension.width, newDimension.height, {
				kernel: sharp.kernel.lanczos3,
				fit: sharp.fit.cover,
				position: sharp.strategy.attention
			})
			.toFormat(this.#outputFormat as keyof FormatEnum)
			.toFile(path.join(this.#dstDir, filename));
	}

	//Set output directory
	async #setDstDir(source: string, destination: string | undefined): Promise<void> {
		if (destination) {
			try {
				await this.#checkDstDir(destination);
				this.#dstDir = destination;
				return;
			} catch (e) {
				throw new Error(`${e}`);
			}
		}

		//if destination was not passed
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");

		const dirName = `resized - ${year}${month}${day}${hours}${minutes}${seconds}`;

		if (this.#srcFile) this.#dstDir = path.join(path.dirname(source), dirName);
		if (this.#srcDir) this.#dstDir = path.join(source, dirName);
		this.#checkDstDir(this.#dstDir);
	}

	//Retrun output format
	#setOutputFormat(outputFormat: string | undefined) {
		this.#outputFormat = outputFormat
			? this.#compatibleFormats.includes(outputFormat)
				? outputFormat
				: this.#defaultOutputFormat //jpg
			: this.#defaultOutputFormat; //jpg
	}

	//Return resized dimension from given sharp.metadata and new width/height
	#setNewDimension(width: number, height: number): { width: number; height: number } {
		const aRatio = width / height;

		if (this.#newWidth !== null && this.#newHeight !== null) {
			return {
				width: this.#newWidth,
				height: this.#newHeight
			};
		}
		//if the new width and height are not set,
		//set the new width and height to the original width and height
		if (this.#newWidth === null && this.#newHeight === null) {
			return {
				width: width,
				height: height
			};
		}

		//if the new width is set, but new height was not provided,
		//calculate the new height based on the original height and width
		if (this.#newWidth === null && this.#newHeight !== null) {
			return {
				width: this.#newHeight * aRatio,
				height: this.#newHeight
			};
		}

		//if the new height is set, but new width was not provided,
		//calculate the new width based on the original height and width
		if (this.#newWidth !== null && this.#newHeight === null) {
			return {
				width: this.#newWidth,
				height: this.#newWidth / aRatio
			};
		}

		return {
			width: width,
			height: height
		};
	}

	async #checkSrcFile(file: string): Promise<void> {
		try {
			const stat = await fsp.stat(file);
			if (!stat.isFile()) throw new Error(` isFile failed.  ${file} is not a valid file.`);
			if (!this.#compatibleFormats.includes(path.extname(file).slice(1))) {
				throw new Error(`${file} is not a valid file. ${path.extname(file).slice(1)}`);
			}
		} catch (e) {
			throw new Error(`stat failed.  ${file} is not a valid file.  ${e}`);
		}
		this.#srcFile = file;
	}
	//check if the passed directory path is valid
	//throw an error if the path is not valid, or there's no file in the directory
	async #checkSrcDir(dir: string): Promise<void> {
		try {
			const stat = await fsp.stat(dir);
			stat.isDirectory();
		} catch (e) {
			throw new Error(`${dir} is not a valid directory.  ${e}`);
		}

		try {
			const dirent = await fsp.readdir(dir, {
				withFileTypes: true,
				recursive: true
			});

			this.#srcFiles = dirent
				.filter(
					(d) => d.isFile() && this.#compatibleFormats.includes(path.extname(d.name).slice(1))
				)
				.map((d) => {
					const newPath = path.resolve(d.parentPath).replace(path.resolve(dir), "");
					return path.join(newPath, d.name);
				});
			console.log(this.#srcFiles);
			if (dirent.length === 0 || this.#srcFiles.length === 0) {
				throw new Error(`${dir} does not contain compatible image file.`);
			}
		} catch (e) {
			throw new Error(`${dir} is not a valid directory.  ${e}`);
		}

		this.#srcDir = dir;
	}

	//check passed dir path as a valid destination directory.
	//Create a directory if it doesn't exist
	//Throw an error if the directory could not be created in a given path
	//Throw an error if the directory is not writable
	async #checkDstDir(dir: string): Promise<boolean> {
		try {
			//create a directory if it doesn't exist
			await fsp.mkdir(dir, { recursive: true });
		} catch (e) {
			throw new Error(
				`mkdir failed during #checkDstDir.  ${(e as Error).message} ${(e as Error).stack}`
			);
		}

		//tmp file for writing test
		const tempFilePath = `${dir}/.isDstDirWritable__test`;
		try {
			// Check if the directory is writable by trying to write a temporary file
			const file = await fsp.writeFile(tempFilePath, "");
		} catch (e) {
			throw new Error(
				`writeFile failed during #checkDstDir.  ${(e as Error).message} ${(e as Error).stack}`
			);
		}

		try {
			//delete the tmp test file
			await fsp.unlink(tempFilePath); // Clean up the temporary file
		} catch (e) {
			//ignore error if fs couldn't locate the file.  throw error only when the error is other than ENOENT.
			if (!/ENOENT|EPERM/.test((e as Error).message))
				throw new Error(
					`Failed to unlink test file in ${dir} ${(e as Error).message} ${(e as Error).stack}`
				);
		}
		return true;
	}
}

export default ImgL;
