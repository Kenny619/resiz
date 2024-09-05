import { workerData } from "node:worker_threads";
import ImgL from "./resize.js";

const img = new ImgL();

try {
	await img.resize(workerData);
} catch (e) {
	console.error(e);
}
