import fsp from "node:fs/promises";
import path from "node:path";

//check passed dir path as a valid destination directory.
//Create a directory if it doesn't exist
//Throw an error if the directory could not be created in a given path
//Throw an error if the directory is not writable
async function dstDir(dir: string): Promise<boolean> {
	try {
		//create a directory if it doesn't exist
		await fsp.mkdir(dir, { recursive: true });
	} catch (e) {
		throw new Error(`mkdir failed during dstDir. directory: ${dir} ${e}`);
	}

	//tmp file for writing test
	const tempFilePath = `${dir}/.isDstDirWritable__test`;
	try {
		// Check if the directory is writable by trying to write a temporary file
		const file = await fsp.writeFile(tempFilePath, "");
	} catch (e) {
		throw new Error(`writeFile failed during dstDir. directory: ${dir} ${e}`);
	}

	try {
		//delete the tmp test file
		await fsp.unlink(tempFilePath); // Clean up the temporary file
	} catch (e) {
		//ignore error if fs couldn't locate the file.  throw error only when the error is other than ENOENT.
		if (!/ENOENT|EPERM/.test((e as Error).message))
			throw new Error(`Failed to unlink test file in ${dir} ${e}`);
	}
	return true;
}

async function getSrcFile(srcFile: string, compatibleFormats: string[]): Promise<string> {
	try {
		const stat = await fsp.stat(srcFile);
		if (!stat.isFile())
			throw new Error(` stat.isFile failed in srcFile().  ${srcFile} is not a valid file.`);
		if (!compatibleFormats.includes(path.extname(srcFile).slice(1))) {
			throw new Error(`incompatible file extension ${path.extname(srcFile).slice(1)} in srcFile()`);
		}
		return srcFile;
	} catch (e) {
		throw new Error(`stat failed in srcFile().  ${srcFile} is not a valid file.  ${e}`);
	}
}
//check if the passed directory path is valid
//throw an error if the path is not valid, or there's no file in the directory
async function getSrcFiles(srcDir: string, compatibleFormats: string[]): Promise<string[]> {
	try {
		const stat = await fsp.stat(srcDir);
		stat.isDirectory();
	} catch (e) {
		throw new Error(`${srcDir} is not a valid directory.  ${e}`);
	}

	try {
		const dirent = await fsp.readdir(srcDir, {
			withFileTypes: true,
			recursive: true
		});

		const srcFiles = dirent
			.filter((d) => d.isFile() && compatibleFormats.includes(path.extname(d.name).slice(1)))
			.map((d) => {
				const newPath = path.resolve(d.parentPath).replace(path.resolve(srcDir), "");
				return path.join(newPath, d.name);
			});

		if (dirent.length === 0 || srcFiles.length === 0) {
			throw new Error(`${srcDir} does not contain compatible image file.`);
		}

		return srcFiles;
	} catch (e) {
		throw new Error(`${srcDir} is not a valid directory.  ${e}`);
	}
}

export { dstDir, getSrcFile, getSrcFiles };
