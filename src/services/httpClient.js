const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const { HTTP_TIMEOUT_MS, HTTP_MAX_RETRIES } = require("../config/env");
const { UpstreamError } = require("../errors/AppError");
const logger = require("../logger");

// Binance order/trade IDs are int64. Node's default JSON.parse decodes them as
// float64, which silently corrupts any integer above Number.MAX_SAFE_INTEGER
// (2^53): e.g. a futures orderId 8389766214563508123 becomes ...508000. The
// JVM then queries order-detail/cancel by that wrong id and Binance answers
// -2013 "Order does not exist" forever — which made every live carry perp leg
// look "failed" after it had actually filled, leaving a naked short (incident
// 2026-06-22). Quote oversized integer LITERALS before parsing so they survive
// as exact strings (the Java side reads them straight back into a long). Numbers
// that fit in 2^53 — timestamps (13 digits), prices/sizes — are left untouched
// and stay JS numbers. The trailing delimiter is a lookahead so adjacent ids in
// an array are all caught in one pass.
const BIG_INT_LITERAL = /([:[,]\s*)(-?\d{16,})(?=\s*[,}\]])/g;

function parseBigIntSafe(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  const quoted = text.replace(BIG_INT_LITERAL, '$1"$2"');
  try {
    return JSON.parse(quoted);
  } catch {
    return JSON.parse(text); // fall back to strict parse (throws on genuine non-JSON)
  }
}

function createClient(baseURL) {
  const client = axios.create({
    baseURL,
    timeout: HTTP_TIMEOUT_MS,
    validateStatus: () => true,
    // Override the default JSON transform with the int64-safe parser above.
    transformResponse: [
      (data) => {
        if (typeof data !== "string" || data.length === 0) return data;
        try {
          return parseBigIntSafe(data);
        } catch {
          return data; // non-JSON body (e.g. an HTML error page) — hand back raw
        }
      },
    ],
  });

  axiosRetry(client, {
    retries: HTTP_MAX_RETRIES,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
      const status = error.response?.status;
      return status === 429 || (status >= 500 && status <= 599);
    },
    onRetry: (count, error, config) => {
      logger.warn(
        { attempt: count, method: config.method, url: config.url, err: error.message },
        "retrying upstream request",
      );
    },
  });

  return client;
}

/**
 * Translate an axios response (or thrown error) into either a resolved payload
 * or a consistent UpstreamError. Always call through this so callers never
 * leak raw exchange error structures.
 */
function handleResponse(resOrErr, { upstream }) {
  if (resOrErr && resOrErr.isAxiosError) {
    throw new UpstreamError(`${upstream} unreachable: ${resOrErr.message}`, {
      status: 502,
      code: "UPSTREAM_UNREACHABLE",
    });
  }
  const { status, data } = resOrErr;
  if (status >= 200 && status < 300) return data;

  const message =
    (data && (data.msg || data.message)) || `${upstream} returned status ${status}`;
  throw new UpstreamError(message, {
    status: status >= 400 && status < 500 ? 400 : 502,
    code: "UPSTREAM_ERROR",
    details: { upstreamStatus: status, upstreamBody: data },
  });
}

module.exports = { createClient, handleResponse, parseBigIntSafe };
