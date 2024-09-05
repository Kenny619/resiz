import path from "node:path";
const obj = {
	source: "H:\\storage\\img\\pic_temp\\sd\\selected\\__sns\\school",
	//width: 100,
	height: 2048,
	quality: 98,
	format: "jpg"
};

const { source, height, width, quality, format } = obj;

// const filePath = "H:\\storage\\img\\pic_temp\\sd\\selected\\__sns\\school\\1.jpg";
// console.log(path.extname(filePath).slice(1));

console.log(path.join("C:\\dev\\imgLib\\", "..", "dirl"));
