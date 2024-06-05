import sharp from "sharp";
import type { FormatEnum } from "sharp";

async function getSrcFileMeta(srcFile: string): Promise<sharp.Metadata> {
	return await sharp(srcFile).metadata();
}

function setOutputFormatQuality(
	dstFile: string,
	quality: number,
	outputFormat: string
): sharp.Sharp {
	const instance = sharp(dstFile);
	switch (outputFormat) {
		case "jpg":
			return instance.jpeg({ quality: quality, mozjpeg: true });
		case "jpeg":
			return instance.jpeg({ quality: quality, mozjpeg: true });
		case "png":
			return instance.png({ quality: quality });
		case "webp":
			return instance.webp({ quality: quality });
		case "gif":
			return instance.gif();
		case "jp2":
			return instance.jp2({ quality: quality });
		case "tiff":
			return instance.tiff({ quality: quality });
		case "avif":
			return instance.avif({ quality: quality });
		case "heif":
			return instance.heif({ quality: quality });
		case "jxl":
			return instance.jxl({ quality: quality });
		case "raw":
			return instance.raw();
		case "tile":
			return instance.tile();
		default:
			return instance.jpeg({ quality: quality, mozjpeg: true });
	}
}

function finalizeInstance(
	instance: sharp.Sharp,
	width: number,
	height: number,
	outputFormat: string,
	dstPath: string
): Promise<sharp.OutputInfo> {
	return instance
		.resize(width, height, {
			kernel: sharp.kernel.lanczos3,
			fit: sharp.fit.cover,
			position: sharp.strategy.attention
		})
		.toFormat(outputFormat as keyof FormatEnum)
		.toFile(dstPath);
}

export { getSrcFileMeta, setOutputFormatQuality, finalizeInstance };
