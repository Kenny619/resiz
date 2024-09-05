import * as sharp from "./sharp.js";

async function getSrcDimension(srcFile: string): Promise<{ width: number; height: number }> {
	try {
		const meta = await sharp.getSrcFileMeta(srcFile);
		if (!meta) {
			throw new Error("Failed to get metadata from source file");
		}

		if (!meta.width || !meta.height || meta.width <= 0 || meta.height <= 0) {
			throw new Error("Failed to get dimension from source file");
		}
		return {
			width: meta.width,
			height: meta.height
		};
	} catch (e) {
		throw new Error(`getSrcDimension failed on ${srcFile} ${e}`);
	}
}

function setOutputFormatQuality(dstFile: string, quality: number, outputFormat: string) {
	return sharp.setOutputFormatQuality(dstFile, quality, outputFormat);
}

function finalizeInstance(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	instance: any,
	width: number,
	height: number,
	outputFormat: string,
	dstPath: string
) {
	return sharp.finalizeInstance(instance, width, height, outputFormat, dstPath);
}

export { getSrcDimension, setOutputFormatQuality, finalizeInstance };
