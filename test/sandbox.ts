import ImgL from "../src/resize";

const option = {
	source: "H:\\storage\\img\\pic_temp\\sd\\selected\\_NFT\\cand\\00071-460809627.png",
	//width: 100,
	height: 4096,
	quality: 100,
	format: "jpg",
	destination: "H:\\storage\\img\\pic_temp\\sd\\selected\\_NFT\\enlarged\\"
};
const img = new ImgL();
img.resize(option);
