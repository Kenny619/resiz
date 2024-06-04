import { workerData } from "node:worker_threads";
import ImgL from "./resize.js";

const img = new ImgL();
img.resize(workerData);
