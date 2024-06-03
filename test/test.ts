import ImgL from "../src/resize.ts";
import { describe, expect, test } from "vitest";

const srcFile ="./imgs/Kenny_avatar.jpg";
const width = 800;
const height = 400;
const outputFormat = "gif";
const option = {
	source: "./test/imgs/",
	width: 800,
	height: 400,
	outputFormat: outputFormat,
	destination: "./test/imgs/multiple/"
}
const img = new ImgL();
await img.resize(option);

/*Scenarios

fn: validateSrcAndDst
01. Valid srcDir and valid dstDir resolves 
02. Valid srcDir with invalid dstDir throws validateSrcAndDst failed error
03. Empty srcDir with valid dstDir throws No files in source directory error 
04. srcDir === dstDir throws source directory and destination directory cannot be the same error 
05. Using a filename instead of directory name for srcDir throws validateSrcAndDst failed error 
06. Using a filename instead of directory name for dstcDir throws validateSrcAndDst failed error 
07. Setting a non-path string to srcDir throws validateSrcAndDst failed error 
08. Setting a non-path string to dstDir throws validateSrcAndDst failed error 

*/
/*
describe("Fn: validateSrcAndDst", () => {
	test("01. Valid srcDir and valid dstDir resolves", async () => {
		const srcDir = "./src/tests/files/srcDir";
		const dstDir = "./src/tests/files/dstDir";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).resolves;
	});

	test("02. Valid srcDir with invalid dstDir throws validateSrcAndDst failed error", async () => {
		const srcDir = "./src/tests/files/srcDir";
		const dstDir = "Z:\\homed\\stDir";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/validateSrcAndDst failed/
		);
	});

	test("03. Empty srcDir with valid dstDir throws No files in source directory error", async () => {
		const srcDir = "./src/tests/files/emptyDir";
		const dstDir = "./src/tests/files/dstDir";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/No files in source directory/
		);
	});

	test("04. srcDir === dstDir throws source directory and destination directory cannot be the same error", async () => {
		const srcDir = "./src/tests/files/srcDir";
		const dstDir = "./src/tests/files/srcDir";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/source directory and destination directory/
		);
	});

	test("05. Using a filename instead of directory name for srcDir throws validateSrcAndDst failed error", async () => {
		const srcDir = "./src/tests/files/srcDir/srcfile.txt";
		const dstDir = "./src/tests/files/dstDir";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/validateSrcAndDst failed/
		);
	});

	test("06. Using a filename instead of directory name for dstcDir throws validateSrcAndDst failed error", async () => {
		const srcDir = "./src/tests/files/srcDir/";
		const dstDir = "./src/tests/files/dstDir/dstfile.txt";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/validateSrcAndDst failed/
		);
	});

	test("07. Setting a non-path string to srcDir throws validateSrcAndDst failed error", async () => {
		const srcDir = "this is the source";
		const dstDir = "./src/tests/files/dstDir";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/validateSrcAndDst failed/
		);
	});

	test("08. Setting a non-path string to dstDir throws validateSrcAndDst failed error", async () => {
		const srcDir = "./src/tests/files/srcDir";
		const dstDir = "?*?";
		await expect(dirl.validateSrcAndDst(srcDir, dstDir)).rejects.toThrowError(
			/validateSrcAndDst failed/
		);
	});
});
*/