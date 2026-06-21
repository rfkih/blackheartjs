// Binance USDⓈ-M FUTURES (perp) client. Mirrors binanceService.js (spot) but
// targets the fapi base URL (production https://fapi.binance.com, or
// TESTNET https://testnet.binancefuture.com via BINANCE_FUTURES_BASE_URL).
//
// Phase 1 of the delta-neutral funding-carry build: the platform was spot-only;
// this adds the perp leg (place/query/cancel market orders + account/position/
// mark-price/funding reads) so a carry can short perp while holding spot.
// Signing is identical to spot (HMAC-SHA256 over the query string). Futures has
// its OWN server-time endpoint (/fapi/v1/time), so we keep a separate offset.
const { generateSignature } = require("../utils/hmac");
const { createClient, handleResponse } = require("./httpClient");
const { BINANCE_FUTURES_BASE_URL } = require("../config/env");

const client = createClient(BINANCE_FUTURES_BASE_URL);
const UPSTREAM = "binance-futures";

let cachedOffset = 0;
let lastSyncAt = 0;
const OFFSET_TTL_MS = 60_000;

async function getServerTimeOffset() {
  const now = Date.now();
  if (now - lastSyncAt < OFFSET_TTL_MS) return cachedOffset;
  const res = await client.get("/fapi/v1/time");
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

// Market order on USDⓈ-M futures. Unlike spot, futures MARKET orders use
// `quantity` (base units) for BOTH sides. `reduceOnly` closes/reduces without
// flipping into the opposite side. `positionSide` only when the account runs
// hedge mode (default one-way mode omits it).
async function placeFuturesMarketOrder({ symbol, side, quantity, reduceOnly, positionSide, newClientOrderId, apiKey, apiSecret, recvWindow }) {
  const normalizedSide = String(side).toUpperCase().trim();
  if (normalizedSide !== "BUY" && normalizedSide !== "SELL") {
    const { ValidationError } = require("../errors/AppError");
    throw new ValidationError([{ path: ["body", "side"], message: "must be BUY or SELL" }]);
  }
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    side: normalizedSide,
    type: "MARKET",
    quantity,
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  if (reduceOnly === true) params.reduceOnly = "true";
  if (positionSide) params.positionSide = String(positionSide).toUpperCase().trim();
  if (newClientOrderId) params.newClientOrderId = newClientOrderId;

  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/fapi/v1/order?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// Set initial leverage for a symbol (signed). The carry perp leg sets a
// conservative leverage (e.g. 2×) BEFORE opening — never trade at the account
// default (20× on testnet), which liquidates a short on a modest basis spike.
async function setFuturesLeverage({ symbol, leverage, apiKey, apiSecret, recvWindow }) {
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    leverage,
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/fapi/v1/leverage?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// Set margin type (ISOLATED/CROSSED) for a symbol (signed). Audit 2026-06-21 (#1): the carry perp
// leg sets ISOLATED before opening so /fapi positionRisk returns a per-position liquidationPrice for
// the margin guard (CROSS returns 0, which blinds it). Binance -4046 "No need to change margin type"
// means it is already set — treat that as success so a re-open stays idempotent.
async function setFuturesMarginType({ symbol, marginType, apiKey, apiSecret, recvWindow }) {
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    marginType: String(marginType).toUpperCase().trim(),
    recvWindow,
    timestamp: await signedTimestamp(),
  };
  const qs = signedQuery(params, apiSecret);
  const res = await client.post(`/fapi/v1/marginType?${qs}`, null, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  if (res && res.data && res.data.code === -4046) {
    return { code: -4046, msg: "No need to change margin type", alreadySet: true };
  }
  return handleResponse(res, { upstream: UPSTREAM });
}

async function futuresOrderDetail({ orderId, origClientOrderId, symbol, apiKey, apiSecret, recvWindow }) {
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    timestamp: await signedTimestamp(),
    recvWindow,
  };
  if (orderId) params.orderId = orderId;
  if (origClientOrderId) params.origClientOrderId = origClientOrderId;
  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/fapi/v1/order?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

async function cancelFuturesOrder({ symbol, orderId, origClientOrderId, apiKey, apiSecret, recvWindow }) {
  const params = {
    symbol: String(symbol).toUpperCase().trim(),
    timestamp: await signedTimestamp(),
    recvWindow,
  };
  if (orderId) params.orderId = orderId;
  if (origClientOrderId) params.origClientOrderId = origClientOrderId;
  const qs = signedQuery(params, apiSecret);
  const res = await client.delete(`/fapi/v1/order?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// Account margin + all positions (used to read available margin before sizing
// the perp leg, and to track open perp exposure for delta reconciliation).
async function futuresAccount({ apiKey, apiSecret, recvWindow }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/fapi/v2/account?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// Per-symbol position risk: positionAmt, entryPrice, markPrice, LIQUIDATION
// price, leverage. The liquidation price drives the Phase-5 margin guard.
async function futuresPositionRisk({ symbol, apiKey, apiSecret, recvWindow }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  if (symbol) params.symbol = String(symbol).toUpperCase().trim();
  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/fapi/v2/positionRisk?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

// PUBLIC (no signing): mark price + the current/last funding rate per symbol.
// Source of the live carry signal + delta (markPrice) for rebalancing.
async function premiumIndex({ symbol }) {
  const path = symbol
    ? `/fapi/v1/premiumIndex?symbol=${String(symbol).toUpperCase().trim()}`
    : "/fapi/v1/premiumIndex";
  const res = await client.get(path);
  return handleResponse(res, { upstream: UPSTREAM });
}

// PUBLIC (no signing): contract specs (LOT_SIZE step/minQty, MIN_NOTIONAL,
// quantityPrecision) per symbol. The carry perp leg sizes off these — and they
// DIFFER between testnet and prod (e.g. BTCUSDT step 0.0001 on testnet vs 0.001
// on prod), so the leg must read them from whatever fapi this gateway targets,
// NOT a hard-coded table. The futures endpoint has no per-symbol filter, so we
// fetch the full set; the caller (Java FuturesContractService) caches + indexes.
async function futuresExchangeInfo() {
  const res = await client.get("/fapi/v1/exchangeInfo");
  return handleResponse(res, { upstream: UPSTREAM });
}

// SIGNED — realized income history (FUNDING_FEE / COMMISSION / REALIZED_PNL …).
// The carry funding-accrual loop sums FUNDING_FEE since the pair opened to track
// the perp short's actual funding P&L. Returns [] when there's nothing in range.
async function futuresIncome({ symbol, incomeType, startTime, limit, apiKey, apiSecret, recvWindow }) {
  const params = { timestamp: await signedTimestamp(), recvWindow };
  if (symbol) params.symbol = String(symbol).toUpperCase().trim();
  if (incomeType) params.incomeType = incomeType;
  if (startTime) params.startTime = startTime;
  if (limit) params.limit = limit;
  const qs = signedQuery(params, apiSecret);
  const res = await client.get(`/fapi/v1/income?${qs}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  return handleResponse(res, { upstream: UPSTREAM });
}

module.exports = {
  placeFuturesMarketOrder,
  setFuturesLeverage,
  setFuturesMarginType,
  futuresOrderDetail,
  cancelFuturesOrder,
  futuresAccount,
  futuresPositionRisk,
  premiumIndex,
  futuresExchangeInfo,
  futuresIncome,
};
