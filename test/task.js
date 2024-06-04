import { workerData } from "node:worker_threads";

const result = isPrime(workerData);
//result ? console.log(`${workerData} is prime`) : console.log(`${workerData} is not prime`);

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
