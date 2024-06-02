import Dirlbass from "../base.ts";
import { describe, expect, test } from "vitest";

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
const dirl = new Dirlbass();

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

/*

fn: isFilePathMatchFilters 
pathA =  ./src/tests/files/filter/dir2/file2.txt
pathB ./src/tests/files/filter/file1.png
pathC ./src/tests/files/filter/dir2/dir3/file5.txt

09. dirNameFilter=filter -> ture, true, true
10. dirNameFilter=dir3 -> false, false, true
11. dirNameFilter=test -> false, false, false
12. fileNameFilter=file -> true, true, true
13. fileNameFilter=5 -> false, false, true,
14. fileNameFilter=config -> false, false, false 
15. extNameFilter=txt -> true, false, true 
16. extNameFilter=png -> false, true, false
17. extNameFilter=xls -> false, false, false
18. dirname=dir2 & filename=file5 -> false, false, true, 
19. dirname=dir2 & extname=txt  -> true, false, true
20. filename=file & extname=png -> false, true, false 
21. dirname=filter & filename=file & extname=txt -> true, false, true
22. dirname=tmp & filename= app & extname=log -> false, false, false 
*/

describe("Fn: getFileCount", () => {
	const pathA = "./src/tests/files/filter/dir2/file2.txt";
	const pathB = "./src/tests/files/filter/file1.png";
	const pathC = "./src/tests/files/filter/dir2/dir3/file5.txt";

	test("09. dirNameFilter=filter -> ture, true, true", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "filter"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "",
			fileNameFilter: "",
			extNameFilter: ""
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("10. dirNameFilter=dir3 -> false, false, true", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "dir3"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("11. dirNameFilter=test -> false, false, false", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "test"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("12. fileNameFilter=file -> true, true, true", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "",
			fileNameFilter: "",
			extNameFilter: ""
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("13. fileNameFilter=5 -> false, false, true", async () => {
		const filter = await dirl.createRegexFilters({
			fileNameFilter: "5"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("14. fileNameFilter=config -> false, false, false", async () => {
		const filter = await dirl.createRegexFilters({
			fileNameFilter: "config"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(false);
	});
	test("15. extNameFilter=txt -> true, false, true", async () => {
		const filter = await dirl.createRegexFilters({
			extNameFilter: "txt"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("16. extNameFilter=png -> false, true, false", async () => {
		const filter = await dirl.createRegexFilters({
			extNameFilter: "png"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(false);
	});
	test("17. extNameFilter=xls -> false, false, false", async () => {
		const filter = await dirl.createRegexFilters({
			extNameFilter: "xls"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(false);
	});
	test("18. dirname=dir2 & filename=file5 -> false, false, true", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "dir2",
			fileNameFilter: "file5"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("19. dirname=dir2 & extname=txt  -> true, false, true", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "dir2",
			extNameFilter: "txt"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("20. filename=file & extname=png -> false, true, false", async () => {
		const filter = await dirl.createRegexFilters({
			fileNameFilter: "file",
			extNameFilter: "png"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(false);
	});
	test("21. dirname=filter & filename=file & extname=txt -> true, false, true", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "filter",
			fileNameFilter: "file",
			extNameFilter: "txt"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(true);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(true);
	});
	test("22. dirname=tmp & filename= app & extname=log -> false, false, false", async () => {
		const filter = await dirl.createRegexFilters({
			dirNameFilter: "tmp",
			fileNameFilter: "app",
			extNameFilter: "log"
		});
		await expect(dirl.isFilePathMatchFilters(pathA, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathB, filter)).resolves.toBe(false);
		await expect(dirl.isFilePathMatchFilters(pathC, filter)).resolves.toBe(false);
	});
});
