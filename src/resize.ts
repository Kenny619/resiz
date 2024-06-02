import fsp from "node:fs/promises";
import path from "node:path";
import { Worker } from "node:worker_threads";
import sharp from "sharp";
import type { FormatEnum } from "sharp";

class Resize {
	#srcFile: string;
	#srcDir: string;
	#srcFiles: string[];
	#dstDir: string;
	#compatibleFormats: string[];
	#newWidth: number | null;
	#newHeight: number | null;
	#outputFormat: string;

	constructor() {
		this.#newWidth = null;
		this.#newHeight = null;
		this.#srcFile = "";
		this.#srcFiles = [];
		this.#srcDir = "";
		this.#dstDir = "";
		this.#outputFormat = "";

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

	width(w: number) {
		this.#newWidth = w;
		return this;
	}

	height(h: number) {
		this.#newHeight = h;
		return this;
	}

	fromDirectory(dir: string) {
		this.#checkSrcDir(dir)
			.then(() => {
				this.#srcDir = dir;
			})
			.catch((e) => {
				throw e;
			});
		return this;
	}

	fromFile(file: string) {
		this.#checkSrcFile(file)
			.then(() => {
				this.#srcFile = file;
			})
			.catch((e) => {
				throw e;
			});
		return this;
	}

	toFormat(format: string) {
		this.#outputFormat = format;
		return this;
	}

	toDirectory(dir: string) {
		this.#checkDstDir(dir)
			.then(() => {
				this.#dstDir = dir;
			})
			.catch((e) => {
				throw e;
			});

		return this;
	}
	async #workerWrapper(sharpInstance: Promise<sharp.OutputInfo>): Promise<void> {
		return new Promise((resolve, reject) => {
			const worker = new Worker(__filename, { workerData: sharpInstance });

			worker.on("message", resolve); // Resolve promise when done
			worker.on("error", reject); // Reject promise on error
			worker.on("exit", (code) => {
				if (code !== 0) {
					reject(new Error(`Worker stopped with exit code ${code}`));
				}
			});
		});
	}

	async #resizeSingleFile(file: string): Promise<sharp.OutputInfo> {
		//initialize sharp instance
		const sharpInstance = sharp(file);
		//set new dimension
		const metadata = await sharpInstance.metadata();
		const newDimension = this.#setNewDimension(metadata);
		//set output format
		this.#setOutputFormat(file);
		//set output Dir
		this.#setOutputDir(file);

		//set new filename
		const filename = `${path.basename(file, path.extname(file))}.${this.#outputFormat}`;

		//return a resize single image function
		return sharpInstance
			.resize(newDimension.width, newDimension.height, {
				kernel: sharp.kernel.lanczos3,
				fit: sharp.fit.cover,
				position: sharp.strategy.attention
			})
			.toFormat(this.#outputFormat as keyof FormatEnum)
			.toFile(path.join(this.#dstDir, filename));
	}

	async exe() {
		if (this.#srcFile) {
			try {
				this.#checkSrcFile(this.#srcFile);
			} catch (e) {
				throw new Error(`#checkSrcFile failed.  ${e}`);
			}
			await this.#resizeSingleFile(this.#srcFile);
		}

		if (this.#srcDir) {
			try {
				this.#checkSrcDir(this.#srcDir);
			} catch (e) {
				throw new Error(`#checkSrcDir failed.  ${e}`);
			}

			//get image file paths from the directory
			const workers = this.#srcFiles.map((file) =>
				this.#workerWrapper(this.#resizeSingleFile(file))
			);
			Promise.all(workers);
		}
	}

	//Set output directory
	#setOutputDir(file: string) {
		if (this.#dstDir === null) {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, "0");
			const day = String(now.getDate()).padStart(2, "0");
			const hours = String(now.getHours()).padStart(2, "0");
			const minutes = String(now.getMinutes()).padStart(2, "0");
			const seconds = String(now.getSeconds()).padStart(2, "0");

			const dirname = `resized - ${year}${month}${day}${hours}${minutes}${seconds}`;
			this.#dstDir = path.join(path.dirname(file), dirname);
		}
	}

	//Retrun output format
	#setOutputFormat(file: string) {
		if (this.#outputFormat === null) {
			const ext = path.extname(file);
			this.#outputFormat = this.#compatibleFormats.includes(ext) ? ext : "jpg";
		}
	}

	//Return resized dimension from given sharp.metadata and new width/height
	#setNewDimension(sharpInstance: sharp.Metadata): { width: number; height: number } {
		const width = sharpInstance.width as number;
		const height = sharpInstance.height as number;
		const aRatio = width / height;
		let newWidth = null;
		let newHeight = null;

		if (this.#newWidth !== null && this.#newHeight !== null) {
			newWidth = this.#newWidth;
			newHeight = this.#newHeight;
		}
		//if the new width and height are not set,
		//set the new width and height to the original width and height
		if (this.#newWidth === null && this.#newHeight === null) {
			newWidth = width;
			newHeight = height;
		}

		//if the new width is set, but new height was not provided,
		//calculate the new height based on the original height and width
		if (this.#newWidth === null && this.#newHeight !== null) {
			newWidth = height * aRatio;
		}

		//if the new height is set, but new width was not provided,
		//calculate the new width based on the original height and width
		if (this.#newHeight !== null && this.#newWidth === null) {
			newHeight = width / aRatio;
		}

		return {
			width: newWidth as number,
			height: newHeight as number
		};
	}

	async #checkSrcFile(file: string): Promise<boolean> {
		try {
			const stat = await fsp.stat(file);
			try {
				stat.isFile();
				if (!this.#compatibleFormats.includes(path.extname(file))) {
					throw new Error(`${file} is not a valid file.`);
				}
			} catch (e) {
				throw new Error(`${file} is not a valid file. ${e}`);
			}
		} catch (e) {
			throw new Error(`${file} is not a valid file.  ${e}`);
		}
		return true;
	}
	//check if the passed directory path is valid
	//throw an error if the path is not valid, or there's no file in the directory
	async #checkSrcDir(dir: string): Promise<boolean> {
		try {
			const stat = await fsp.stat(dir);
			try {
				stat.isDirectory();
			} catch (e) {
				throw new Error(`${dir} is not a valid directory. ${e}`);
			}
		} catch (e) {
			throw new Error(`${dir} is not a valid directory.  ${e}`);
		}

		try {
			const dirent = await fsp.readdir(dir, {
				withFileTypes: true,
				recursive: true
			});

			this.#srcFiles = dirent
				.filter((d) => d.isFile() && this.#compatibleFormats.includes(path.extname(d.name)))
				.map((d) => d.name);
			if (dirent.length === 0 || this.#srcFiles.length === 0) {
				throw new Error(`${dir} does not contain compatible image file.`);
			}
		} catch (e) {
			throw new Error(`${dir} is not a valid directory.  ${e}`);
		}
		return true;
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

export default Resize;

const r = new Resize();
/*
export default async function resizeImg(
	srcDir: string,
	dstDir: string,
	quality = 99,
	extension = "jpg",
	option: Partial<option> = {}
) {
	const compatibleFileFomats = [
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

	const outputFormat: outputFunction = {
		jpg: (instance) => {
			return instance.clone().jpeg({ quality: quality, mozjpeg: true });
		},
		jpeg: (instance) => {
			return instance.clone().jpeg({ quality: quality, mozjpeg: true });
		},
		png: (instance) => {
			return instance.clone().png({ quality: quality, compressionLevel: 8 });
		},
		webp: (instance) => {
			return instance.clone().webp({ quality: quality, lossless: true });
		}
	};

	if (!compatibleFileFomats.includes(extension))
		throw new Error(`Passed extention of "${extension} is incompatible with this program.`);

	if (!fs.existsSync(srcDir)) throw new Error(`Source directory ${srcDir} does not exist.`);
	if (quality > 100 || quality < 1)
		throw new Error(`Value (${quality}) of quality needs to be between 1 to 100. `);

	const pickImgFiles = (Dirent: fs.Dirent) => {
		if (!Dirent.isFile()) return false;
		const ext = Dirent.name.match(/\.([^.]+)$/) && RegExp.$1;
		return ext === null ? false : compatibleFileFomats.includes(ext);
	};
	const srcFileDirents = fs.readdirSync(srcDir, { withFileTypes: true }).filter(pickImgFiles);

	const resizeParams: ResizeOptions = option;
	resizeParams.kernel = sharp.kernel.lanczos3;
	if (Object.hasOwn(option, "height") && Object.hasOwn(option, "width")) {
		resizeParams.fit = "outside";
	}

	checkDir(dstDir);

	for (const dirent of srcFileDirents) {
		const srcFullPath = `${dirent.path}\\${dirent.name}`;
		const dstFileName = dirent.name.replace(/\.[^.]+$/, `.${extension}`);
		const dstFilePath = `${dstDir}\\${dstFileName}`;

		const image = sharp(srcFullPath).resize(resizeParams);
		Object.keys(outputFormat).includes(extension)
			? outputFormat[extension as outputformat](image).toFile(dstFilePath)
			: image.toFormat(extension as keyof FormatEnum).toFile(dstFilePath);
	}

	const statusChecker = new Promise((resolve) => {
		setInterval(() => {
			if (checkStatus()) {
				resolve("process completed.");
			}
		}, 1000);
	});

	statusChecker.then((m) => {
		console.log(m);
		process.exit();
	});

	function checkStatus() {
		const outputs = fs
			.readdirSync(dstDir, { withFileTypes: true })
			.filter((Dirent) => Dirent.name.match(extension));
		return outputs.length === srcFileDirents.length ? true : false;
	}
}
*/
