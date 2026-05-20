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

exports.placeLimitOrderBinance = async (req, res, next) => {
  try {
    const {
      symbol, side, price, quantity, timeInForce, postOnly,
      newClientOrderId, recvWindow, apiKey, apiSecret,
    } = req.body;
    const data = await binanceService.placeLimitOrder({
      symbol, side, price, quantity, timeInForce, postOnly,
      newClientOrderId, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.cancelOrderBinance = async (req, res, next) => {
  try {
    const { symbol, orderId, origClientOrderId, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.cancelOrder({
      symbol, orderId, origClientOrderId, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.openOrdersBinance = async (req, res, next) => {
  try {
    const { symbol, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.openOrders({
      symbol, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
