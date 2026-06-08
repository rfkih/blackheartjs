const { generateSignature } = require("../utils/hmac");
const { createClient, handleResponse } = require("./httpClient");
const { BINANCE_BASE_URL } = require("../config/env");

const client = createClient(BINANCE_BASE_URL);
const UPSTREAM = "binance";

// Cached server-time offset. Binance rejects requests outside recvWindow, so
// we sync once per process and refresh opportunistically.
let cachedOffset = 0;
let lastSyncAt = 0;
const OFFSET_TTL_MS = 60_000;

async function getServerTimeOffset() {
  const now = Date.now();
  if (now - lastSyncAt < OFFSET_TTL_MS) return cachedOffset;
  const res = await client.get("/api/v3/time");
  const data = handleResponse(res, { upstream: UPSTREAM });
  cachedOffset = data.serverTime - Date.now();
  lastSyncAt = Date.now();
  return cachedOffset;
}

async function signedTimestamp() {
  return Date.now() + (await getServerTimeOffset());
}

function signedQuery(params, apiSecret) {
  const qs = new URLSearchParams(params).toString();
  const signature = generateSignature(qs, apiSecret);
  return `${qs}&signature=${signature}`;
}

async function getAsset({ asset, recvWindow, apiKey, apiSecret }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  if (asset) params.asset = asset;

  // Binance signs the exact body/query it receives. For this SAPI endpoint
  // the payload goes on the query string — no JSON body.
  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/sapi/v3/asset/getUserAsset?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function placeMarketOrder({ symbol, side, amount, apiKey, apiSecret, recvWindow }) {
  const normalizedSide = String(side).toUpperCase().trim();
  if (normalizedSide !== "BUY" && normalizedSide !== "SELL") {
    const { ValidationError } = require("../errors/AppError");
    throw new ValidationError([{ path: ["body", "side"], message: "must be BUY or SELL" }]);
  }

  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    side: normalizedSide,
    type: "MARKET",
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  if (normalizedSide === "BUY") params.quoteOrderQty = amount;
  else params.quantity = amount;

  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/api/v3/order?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function orderDetail({ orderId, symbol, recvWindow, apiKey, apiSecret }) {
  const params = {
    orderId,
    symbol: String(symbol).toUpperCase().trim(),
    timestamp: await signedTimestamp(),
    recvWindow,
  };
  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/api/v3/order?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function placeLimitOrder({
  symbol,
  side,
  price,
  quantity,
  timeInForce,
  postOnly,
  newClientOrderId,
  apiKey,
  apiSecret,
  recvWindow,
}) {
  const normalizedSide = String(side).toUpperCase().trim();
  if (normalizedSide !== "BUY" && normalizedSide !== "SELL") {
    const { ValidationError } = require("../errors/AppError");
    throw new ValidationError([{ path: ["body", "side"], message: "must be BUY or SELL" }]);
  }

  // LIMIT_MAKER cannot carry timeInForce; Binance rejects the combination.
  // Plain LIMIT requires timeInForce; default GTC for caller convenience.
  const type = postOnly ? "LIMIT_MAKER" : "LIMIT";
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    side: normalizedSide,
    type,
    price,
    quantity,
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  if (type === "LIMIT") params.timeInForce = timeInForce || "GTC";
  if (newClientOrderId) params.newClientOrderId = newClientOrderId;

  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/api/v3/order?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function cancelOrder({ symbol, orderId, origClientOrderId, apiKey, apiSecret, recvWindow }) {
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    timestamp: await signedTimestamp(),
    recvWindow,
  };
  if (orderId) params.orderId = orderId;
  if (origClientOrderId) params.origClientOrderId = origClientOrderId;

  const qs = signedQuery(params, apiSecret);
  const res = await client.delete(`/api/v3/order?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function openOrders({ symbol, apiKey, apiSecret, recvWindow }) {
  const params = {
    timestamp: await signedTimestamp(),
    recvWindow,
  };
  if (symbol) params.symbol = String(symbol).toUpperCase().trim();

  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/api/v3/openOrders?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// --- Simple Earn (Flexible) ---------------------------------------------
// Signed SAPI v1 endpoints. USDT is not "staked" (not a PoS asset); the
// hedging cash leg parks idle USDT in a Flexible Simple-Earn product to earn
// yield, redeemable on demand. Payload goes on the signed query string; the
// POST endpoints carry no JSON body (Binance signs the exact query it receives).

async function simpleEarnFlexibleList({ asset, productId, current, size, recvWindow, apiKey, apiSecret }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  if (asset) params.asset = String(asset).toUpperCase().trim();
  if (productId) params.productId = productId;
  if (current) params.current = current;
  if (size) params.size = size;

  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/sapi/v1/simple-earn/flexible/list?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function simpleEarnFlexibleSubscribe({ productId, amount, autoSubscribe, sourceAccount, recvWindow, apiKey, apiSecret }) {
  const params = {
    productId,
    amount,
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  if (autoSubscribe !== undefined) params.autoSubscribe = autoSubscribe;
  if (sourceAccount) params.sourceAccount = sourceAccount;

  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/sapi/v1/simple-earn/flexible/subscribe?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function simpleEarnFlexibleRedeem({ productId, redeemAll, amount, destAccount, recvWindow, apiKey, apiSecret }) {
  const params = {
    productId,
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  // Binance accepts redeemAll=true OR an explicit amount, not both meaningfully.
  if (redeemAll === true) params.redeemAll = true;
  else if (amount !== undefined) params.amount = amount;
  if (destAccount) params.destAccount = destAccount;

  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/sapi/v1/simple-earn/flexible/redeem?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function simpleEarnFlexiblePosition({ asset, productId, current, size, recvWindow, apiKey, apiSecret }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  if (asset) params.asset = String(asset).toUpperCase().trim();
  if (productId) params.productId = productId;
  if (current) params.current = current;
  if (size) params.size = size;

  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/sapi/v1/simple-earn/flexible/position?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function simpleEarnFlexibleRewards({ type, asset, productId, startTime, endTime, current, size, recvWindow, apiKey, apiSecret }) {
  const params = { type, timestamp: await signedTimestamp(), recvWindow };
  if (asset) params.asset = String(asset).toUpperCase().trim();
  if (productId) params.productId = productId;
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  if (current) params.current = current;
  if (size) params.size = size;

  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/sapi/v1/simple-earn/flexible/history/rewardsRecord?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// --- Deposit history --------------------------------------------------
// Signed SAPI v1 read endpoint. Used by the full-balance hedge to derive
// the deposit-time cost basis of pre-existing (adopted) BTC: each deposit
// is valued at the BTCUSDT close at/just before its insertTime. Payload
// goes on the signed query string; this is a GET (no JSON body) — Binance
// signs the exact query it receives.
async function depositHistory({ coin, startTime, limit, recvWindow, apiKey, apiSecret }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  if (coin) params.coin = String(coin).toUpperCase().trim();
  if (startTime !== undefined && startTime !== null) params.startTime = startTime;
  // Binance caps deposit/hisrec at 1000 rows/page; default to the max.
  params.limit = limit !== undefined && limit !== null ? limit : 1000;

  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/sapi/v1/capital/deposit/hisrec?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

module.exports = {
  getAsset,
  placeMarketOrder,
  orderDetail,
  placeLimitOrder,
  cancelOrder,
  openOrders,
  depositHistory,
  simpleEarnFlexibleList,
  simpleEarnFlexibleSubscribe,
  simpleEarnFlexibleRedeem,
  simpleEarnFlexiblePosition,
  simpleEarnFlexibleRewards,
};
