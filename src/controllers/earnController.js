const binanceService = require("../services/binanceService");

exports.flexibleList = async (req, res, next) => {
  try {
    const { asset, productId, current, size, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.simpleEarnFlexibleList({
      asset, productId, current, size, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.flexiblePosition = async (req, res, next) => {
  try {
    const { asset, productId, current, size, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.simpleEarnFlexiblePosition({
      asset, productId, current, size, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.flexibleRewards = async (req, res, next) => {
  try {
    const { type, asset, productId, startTime, endTime, current, size, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.simpleEarnFlexibleRewards({
      type, asset, productId, startTime, endTime, current, size, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.flexibleSubscribe = async (req, res, next) => {
  try {
    const { productId, amount, autoSubscribe, sourceAccount, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.simpleEarnFlexibleSubscribe({
      productId, amount, autoSubscribe, sourceAccount, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.flexibleRedeem = async (req, res, next) => {
  try {
    const { productId, redeemAll, amount, destAccount, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.simpleEarnFlexibleRedeem({
      productId, redeemAll, amount, destAccount, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
