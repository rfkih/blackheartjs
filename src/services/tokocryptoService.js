const { generateSignature } = require("../utils/hmac");
const { createClient, handleResponse } = require("./httpClient");
const { TOKOCRYPTO_BASE_URL } = require("../config/env");

const client = createClient(TOKOCRYPTO_BASE_URL);
const UPSTREAM = "tokocrypto";

function signedQuery(params, apiSecret) {
  const qs = new URLSearchParams(params).toString();
  const signature = generateSignature(qs, apiSecret);
  return `${qs}&signature=${signature}`;
}

async function getAsset({ asset, recvWindow, apiKey, apiSecret }) {
  const qs = signedQuery({ asset, timestamp: Date.now(), recvWindow }, apiSecret);
  const res = await client.get(`/open/v1/account/spot/asset?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function placeMarketOrder({ symbol, side, amount, isQuoteQty, apiKey, apiSecret }) {
  const params = {
    symbol,
    side, // 0 = Buy, 1 = Sell (Tokocrypto convention)
    type: 2, // Market
    timestamp: Date.now(),
    newOrderRespType: "FULL",
  };
  if (isQuoteQty) params.quoteOrderQty = amount;
  else params.quantity = amount;

  // Sign and send the exact same query string — never let axios re-serialize
  // params or the signature will mismatch.
  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/open/v1/orders?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function orderDetail({ orderId, clientId, recvWindow, apiKey, apiSecret }) {
  const params = { orderId, timestamp: Date.now(), recvWindow };
  if (clientId) params.clientId = clientId;
  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/open/v1/orders/detail?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

module.exports = { getAsset, placeMarketOrder, orderDetail };
