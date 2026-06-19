const tokocryptoService = require("../services/tokocryptoService");
const binanceService = require("../services/binanceService");
const binanceFuturesService = require("../services/binanceFuturesService");

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

// --- Binance USDⓈ-M futures (perp leg for delta-neutral carry, Phase 1) ---

exports.placeFuturesMarketOrderBinance = async (req, res, next) => {
  try {
    const { symbol, side, quantity, reduceOnly, positionSide, newClientOrderId, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.placeFuturesMarketOrder({
      symbol, side, quantity, reduceOnly, positionSide, newClientOrderId, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.futuresOrderDetailBinance = async (req, res, next) => {
  try {
    const { symbol, orderId, origClientOrderId, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.futuresOrderDetail({
      symbol, orderId, origClientOrderId, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.cancelFuturesOrderBinance = async (req, res, next) => {
  try {
    const { symbol, orderId, origClientOrderId, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.cancelFuturesOrder({
      symbol, orderId, origClientOrderId, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.futuresAccountBinance = async (req, res, next) => {
  try {
    const { recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.futuresAccount({ recvWindow, apiKey, apiSecret });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.futuresPositionRiskBinance = async (req, res, next) => {
  try {
    const { symbol, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.futuresPositionRisk({ symbol, recvWindow, apiKey, apiSecret });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.futuresPremiumIndexBinance = async (req, res, next) => {
  try {
    const { symbol } = req.body;
    const data = await binanceFuturesService.premiumIndex({ symbol });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.futuresExchangeInfoBinance = async (req, res, next) => {
  try {
    const data = await binanceFuturesService.futuresExchangeInfo();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.futuresIncomeBinance = async (req, res, next) => {
  try {
    const { symbol, incomeType, startTime, limit, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.futuresIncome({
      symbol, incomeType, startTime, limit, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.setFuturesLeverageBinance = async (req, res, next) => {
  try {
    const { symbol, leverage, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceFuturesService.setFuturesLeverage({
      symbol, leverage, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
