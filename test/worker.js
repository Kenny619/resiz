import { Worker, isMainThread, workerData, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
//const __filename = fileURLToPath(import.meta.url);

const aOne = [];
const aTwo = [];
for (let i = 1; i <= 100; i++) {
	const p = new Promise((resolve, reject) => {
		resolve(new Worker("./test/task.js", { workerData: i }));
	});
	aOne.push(p);
}
console.time("using worker_threads");
await Promise.all(aOne);
console.timeEnd("using worker_threads");

for (let i = 1; i <= 100; i++) {
	const p = new Promise((resolve, reject) => {
		resolve(isPrime(i));
	});
	aTwo.push(p);
	//result ? console.log(`${workerData} is prime`) : console.log(`${workerData} is not prime`);
}
console.time("without worker_threads");
await Promise.all(aTwo);
console.timeEnd("without worker_threads");
/*
const promises = nArr.map((n) => {
	return new Promise((resolve, reject) => {
		//   const worker = new Worker(__filename, { workerData: n });
		if (isMainThread) {
			const worker = new Worker(__filename, { workerData: n });
			worker.on("message", (msg) => console.log(`Worker message received: ${msg}`));
			worker.on("error", (err) => console.error(err));
			worker.on("exit", (code) => console.log(`Worker exited with code ${code}.`));
		} else {
			const result = isPrime(n);
			resolve(parentPort?.postMessage(`${n}? ${result}.`));
		}
	});
});

//await Promise.all(promises);
*/

function isPrime(n) {
	let i = 2;
	return checkPrime(n);

	function checkPrime(n) {
		if (n < 2) return false;
		if (n === i) return true;
		if (n % i === 0) return false;

		i++;
		return checkPrime(n);
	}
}
