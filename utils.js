const Jimp = require("jimp");
const jsQR = require("jsqr");
const QRCode = require("qrcode");

const decodeQR = async (path) => {
    const image = await Jimp.read(path);

    const imageData = {
        data: new Uint8ClampedArray(image.bitmap.data),
        width: image.bitmap.width,
        height: image.bitmap.height,
    };

    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);

    if (!decodedQR) {
        throw new Error("未找到二维码");
    }

    return decodedQR.data;
};

const generateQRtoTerminal = (text) => {
    return QRCode.toString(
        text,
        { type: "terminal", errorCorrectionLevel: 'L', version: 7 },
        function (err) {
            if (err) throw err;
        }
    );
};

module.exports = {
    decodeQR,
    generateQRtoTerminal,
};
