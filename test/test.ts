import path from "node:path";
import fsp from "node:fs/promises";

const format = [".jpg", ".png", ".webp"];
const filePaths = await fsp
	.readdir("../../Downloads", { withFileTypes: true, recursive: true })
	.then((dirents) => dirents.map((d) => path.resolve(process.cwd(), path.join(d.path, d.name))))
	.then((filePaths) => filePaths.filter((filePath) => format.includes(path.extname(filePath).toLowerCase())));

async function setSrcDir(source: string): Promise<string> {
	try {
		const filePaths = await fsp
			.readdir(source as string, {
				withFileTypes: true,
				recursive: true
			})
			.then((dirent) => dirent.map((d) => path.resolve(process.cwd(), path.join(d.parentPath, d.name))))
			.then((filePaths) => filePaths.filter((filePath) => format.includes(path.extname(filePath))));

		if (filePaths.length === 0) {
			throw new Error(`${source} does not contain compatible image file.`);
		}
	} catch (e) {
		throw new Error(`Failed to read files in dir: ${source}.  ${e}`);
	}

	//set absolute path
	const srcDir = path.resolve(process.cwd(), source as string);
	return srcDir;
}

// const srcDir = await setSrcDir("../../Downloads");
// console.log("srcDir -->", srcDir);

const str = "";
if (!str) console.log("empty string");
