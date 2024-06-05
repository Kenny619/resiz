import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Worker, isMainThread, workerData, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import * as images from "./utils/images.js";
import * as validation from "./utils/validations.js";
import * as utils from "./utils/helpers.js";

type inputOptions = {
	source: string;
	destination?: string;
	width?: number;
	height?: number;
	quality?: number;
	outputFormat?: string;
	callback?: () => void;
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
	#wokers: Worker[];
	#threads: number;

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
		//worker threads pool
		this.#wokers = [];
		this.#threads = os.cpus().length / 2 - 1;

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
		const { source, destination, width, height, quality, outputFormat } = option;

		//validate and set source
		if (!source) throw new Error("source file or directory is missing.");

		//validate source file/directory and set this.#srcFile or this.#srcFiles
		try {
			const stat = await fsp.stat(source);
			if (stat.isFile())
				this.#srcFile = await validation.getSrcFile(source, this.#compatibleFormats);
			if (stat.isDirectory())
				this.#srcFiles = await validation.getSrcFiles(source, this.#compatibleFormats);
		} catch (e) {
			throw new Error(`${e}`);
		}

		//set quality
		if (option.quality) this.#quality = option.quality;

		//set width and height
		if (width) this.#newWidth = width;
		if (height) this.#newHeight = height;

		//set output format
		this.#setOutputFormat(outputFormat);

		//set destination directory this.#dstDir
		try {
			await this.#setDstDir(source, destination);
		} catch (e) {
			throw `${e}`;
		}

		if (this.#srcFile) {
			try {
				await this.#getResizeInstance(this.#srcFile);
				if (Object.hasOwn(option, "callback") && typeof option.callback === "function") {
					option.callback();
				}
			} catch (e) {
				throw `${e}`;
			}
		}

		if (this.#srcFiles) {
			const __dirname = import.meta.dirname;
			this.#srcDir = source;
			for (const file of this.#srcFiles) {
				option.source = path.join(this.#srcDir, file);
				option.destination = this.#dstDir;
				option.quality = this.#quality;
				option.outputFormat = this.#outputFormat;
				const worker = new Worker(path.join(__dirname, "task.js"), { workerData: option });
				this.#wokers.push(worker);
				if (this.#wokers.length === this.#threads) {
					await Promise.all(this.#wokers);
					this.#wokers = [];
				}
			}
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async #getResizeInstance(srcFile: string): Promise<any> {
		//initialize instance
		const resizeInstance = images.setOutputFormatQuality(
			srcFile,
			this.#quality,
			this.#outputFormat
		);

		try {
			//calculate new dimension
			const srcMeta = await images.getSrcDimension(srcFile);
			const { width, height } = this.#getNewDimension(srcMeta.width, srcMeta.height);
			//align file extension with outputFormat
			const filename = `${path.basename(srcFile, path.extname(srcFile))}.${this.#outputFormat}`;
			//set destination path
			const dstPath = path.join(this.#dstDir, filename);
			//finalize the sharp instance
			return images.finalizeInstance(resizeInstance, width, height, this.#outputFormat, dstPath);
		} catch (e) {
			throw `${e}`;
		}
	}

	//Set output directory
	async #setDstDir(source: string, destination: string | undefined): Promise<void> {
		this.#dstDir = destination
			? destination
			: path.join(path.dirname(source), utils.getFailSafeDirName());

		try {
			await validation.dstDir(this.#dstDir);
		} catch (e) {
			throw `${e}`;
		}
	}

	//set passed outputFormat to this.#outputFormat.
	//if no outputFormat was passed use this.#defaultOutputFormat
	#setOutputFormat(outputFormat: string | undefined) {
		this.#outputFormat = outputFormat
			? this.#compatibleFormats.includes(outputFormat)
				? outputFormat
				: this.#defaultOutputFormat //jpg
			: this.#defaultOutputFormat; //jpg
	}

	//Return resized dimension from given sharp.metadata and new width/height
	#getNewDimension(width: number, height: number): { width: number; height: number } {
		const aRatio = Math.ceil(width / height);

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
				height: Math.ceil(this.#newWidth / aRatio)
			};
		}

		return {
			width: width,
			height: height
		};
	}
}

export default ImgL;
