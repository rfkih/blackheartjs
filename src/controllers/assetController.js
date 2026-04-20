const tokocryptoService = require("../services/tokocryptoService");
const binanceService = require("../services/binanceService");

exports.getAsset = async (req, res, next) => {
  try {
    const { asset, recvWindow, apiKey, apiSecret } = req.query;
    const data = await tokocryptoService.getAsset({ asset, recvWindow, apiKey, apiSecret });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getAssetBinance = async (req, res, next) => {
  try {
    const { asset, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.getAsset({ asset, recvWindow, apiKey, apiSecret });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
