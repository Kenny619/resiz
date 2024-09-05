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
    outputFormat?: string;
};

class Resiz {
    #source: string | null;
    #srcFile: string | null;
    #srcDir: string | null;
    #srcFiles: string[];
    #dstDir: string | null;
    #formats: string[];
    #newWidth: number | null;
    #newHeight: number | null;
    #outputFormat: string;
    #quality: number;

    //fail-safe default values
    #defaultOutputFormat: string;

    constructor() {
        this.#newWidth = null;
        this.#newHeight = null;
        this.#source = null;
        this.#dstDir = null;
        this.#outputFormat = "jpg";
        this.#quality = 100;
        //default values
        this.#srcFile = null;
        this.#srcFiles = [];
        this.#srcDir = null;
        this.#defaultOutputFormat = "jpg";

        //sharp compatible formats
        this.#formats = [
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

    async run(option: inputOptions) {
        if (option.width) this.#newWidth = option.width;
        if (option.height) this.#newHeight = option.height;
        if (option.source) this.#source = option.source;
        if (option.destination) this.#dstDir = option.destination;
        if (option.outputFormat) this.#outputFormat = option.outputFormat;
        if (option.quality) this.#quality = option.quality;

        try {
            await this.#valOptions();
        } catch (e) {
            throw `${e}`;
        }

        if (this.#srcFile)
            try {
                await this.#resizeSingleFile(this.#srcFile);
            } catch (e) {
                throw `${e}`;
            }

        if (this.#srcDir) {
            const workers = this.#srcFiles.map((file) => this.#workerWrapper(file));
            try {
                await Promise.all(workers);
            } catch (e) {
                throw `${e}`;
            }
        }
    }

    async #valOptions(): Promise<void> {

        //validate and set source
        if (!this.#source) throw new Error("Specify the source fle or directory.");

        //set srcFile/srcDir
        try {
            const stat = await fsp.stat(this.#source);
            if (stat.isFile()) this.#setSrcFile();
            if (stat.isDirectory())
                this.#setSrcDir();
        } catch (e) {
            throw new Error(`Failed to set source.  ${e}`);
        }

        //set output format
        this.#setOutputFormat();

        //set destination
        try {
            await this.#setDstDir();
        } catch (e) {
            throw new Error(`Failed to set destination.  ${e}`);
        }
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
                try {
                    this.#resizeSingleFile(workerData).then(() => {
                        parentPort?.postMessage(` \"${workerData}\".`);
                    });
                } catch (e) {
                    reject(new Error(`Worker failed to resize image.  ${e}`));
                }
            }
        });
    }

    async #resizeSingleFile(filePath: string): Promise<sharp.OutputInfo> {
        //initialize sharp instance
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
            .toFile(path.join(this.#dstDir as string, filename));
    }

    //Set output directory
    async #setDstDir(): Promise<void> {

        //set #dstDir if destination was not passed as an argument
        if (this.#dstDir === null) {
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

            console.log("this.#dstDir -->", this.#dstDir);
            console.log("this.#srcFile", this.#srcFile);
            console.log("this.#srcDir", this.#srcDir);
        }

        try {
            this.#dstDir = this.#dstDir as string;
            await this.#valDstDir();
        } catch (e) {
            throw new Error(`Failed to set destination directory.  ${e}`);
        }
    }

    //Check if the output format is valid
    //If not, set the default output format
    #setOutputFormat(): void {
        if (!this.#formats.includes(this.#outputFormat))
            this.#outputFormat = this.#defaultOutputFormat;
    }

    //Return resized dimension from given sharp.metadata and new width/height
    #setNewDimension(width: number, height: number): { width: number; height: number } {

        const aRatio = width / height;

        //if both new width and height are set, return the new width and height
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

    //check if the passed file path is valid
    //throw an error if the path is not valid, or the file is not an image file
    #setSrcFile(): void {
        //check if the image file is compatible with Sharp
        const ext = path.extname(this.#source as string).slice(1);
        if (!this.#formats.includes(ext))
            throw new Error(`${this.#source} is not a valid file. ${ext}`);

        this.#srcFile = this.#source as string;
    }

    //check if the passed directory path is valid
    //throw an error if the path is not valid, or there's no file in the directory
    async #setSrcDir(): Promise<void> {
        try {
            // const dirent = await fsp.readdir(this.#source as string, {
            //     withFileTypes: true,
            //     recursive: true
            // });

            const dirent = await fsp.readdir(this.#source as string, {
                withFileTypes: true,
                recursive: true,
            });

            console.log("dirent -->", dirent);

            this.#srcFiles = dirent
                .filter(
                    //filter out files that are not compatible image files
                    (d) => d.isFile() && this.#formats.includes(path.extname(d.name).slice(1))
                )
                .map((d) => {
                    //return absolute path
                    return path.resolve(process.cwd(), path.join(d.parentPath, d.name));
                });

            console.log("this.#srcFiles -->", this.#srcFiles);
            if (dirent.length === 0 || this.#srcFiles.length === 0) {
                throw new Error(`${this.#source} does not contain compatible image file.`);
            }
        } catch (e) {
            throw new Error(`Failed to read files in dir: ${this.#source}.  ${e}`);
        }

        //set absolute path
        this.#srcDir = path.resolve(process.cwd(), this.#source as string);
        console.log("this.#srcDir -->", this.#srcDir);
    }

    //check passed dir path as a valid destination directory.
    //Create a directory if it doesn't exist
    //Throw an error if the directory could not be created in a given path
    //Throw an error if the directory is not writable
    async #valDstDir(): Promise<void> {
        try {
            //create a directory if it doesn't exist
            await fsp.mkdir(this.#dstDir as string, { recursive: true });
        } catch (e) {
            throw new Error(
                `Failed to create destination directory ${this.#dstDir}.  ${e}`
            );
        }

        //tmp file for writing test
        const tempFilePath = `${this.#dstDir}/.isDstDirWritable__test`;
        try {
            // Check if the directory is writable by trying to write a temporary file
            const file = await fsp.writeFile(tempFilePath, "");
            await fsp.rm(tempFilePath); // Clean up the temporary file
        } catch (e) {
            //ignore error if fs couldn't locate the file.  throw error only when the error is other than ENOENT.
            if (!/ENOENT|EPERM/.test((e as Error).message))
                throw new Error(
                    `Write test failed in ${this.#dstDir}.  ${e}`
                );
        }

    }

}

const resiz = new Resiz();
export default resiz;
