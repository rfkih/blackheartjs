const tokocryptoService = require("../services/tokocryptoService");
const binanceService = require("../services/binanceService");

exports.placeMarketOrder = async (req, res, next) => {
  try {
    const { symbol, side, amount, isQuoteQty, recvWindow, apiKey, apiSecret } = req.body;
    const data = await tokocryptoService.placeMarketOrder({
      symbol, side, amount, isQuoteQty, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.orderDetail = async (req, res, next) => {
  try {
    const { orderId, clientId, recvWindow, apiKey, apiSecret } = req.body;
    const data = await tokocryptoService.orderDetail({
      orderId, clientId, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.placeMarketOrderBinance = async (req, res, next) => {
  try {
    const { symbol, side, amount, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.placeMarketOrder({
      symbol, side, amount, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.orderDetailBinance = async (req, res, next) => {
  try {
    const { orderId, symbol, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.orderDetail({
      orderId, symbol, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
