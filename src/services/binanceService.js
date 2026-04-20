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

module.exports = { getAsset, placeMarketOrder, orderDetail };
