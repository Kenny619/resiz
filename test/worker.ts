import { Worker, isMainThread, workerData, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const nArr: number[] = [];
for (let i = 0; i < 100000; i++) {
	nArr.push(i);
}
const __filename = fileURLToPath(import.meta.url);

if (isMainThread) {
	const worker = new Worker(__filename, { workerData: "hello" });
	worker.on("message", (msg) => console.log(`Worker message received: ${msg}`));
	worker.on("error", (err) => console.error(err));
	worker.on("exit", (code) => console.log(`Worker exited with code ${code}.`));
} else {
	const data = workerData;
	parentPort?.postMessage(`You said \"${data}\".`);
}

function isPrime(n: number): boolean {
	let i = 2;
	return checkPrime(n);

	function checkPrime(n: number): boolean {
		if (n < 2) return false;
		if (n === i) return true;

		if (n % i === 0) return false;

		i++;
		return checkPrime(n);
	}
}
