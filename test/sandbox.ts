import ImgL from "../dist/resize.js";

const option = {
	//source: "H:\\storage\\img\\pic_temp\\sd\\selected\\_NFT\\cand\\00071-460809627.png",
	source: "./test/imgs/multiple",
	width: 6000,
	//height: 800,
	quality: 100,
	outputFormat: "jpg"
	//destination: "../test/imgs/multiple/output/"
};
const img = new ImgL();
img.resize(option);
