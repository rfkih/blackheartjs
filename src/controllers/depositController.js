const binanceService = require("../services/binanceService");

// Returns the raw Binance deposit-history array, e.g.
//   [{ amount, coin, insertTime, txId, status }, ...]
// Creds (apiKey/apiSecret) arrive in the request body the same way the earn
// and order routes receive them. The route is gated behind FULL_BALANCE_ENABLED
// (see routes/deposits.js) which short-circuits to [] when the feature is off.
exports.depositHistory = async (req, res, next) => {
  try {
    const { coin, startTime, limit, recvWindow, apiKey, apiSecret } = req.body;
    const data = await binanceService.depositHistory({
      coin, startTime, limit, recvWindow, apiKey, apiSecret,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
