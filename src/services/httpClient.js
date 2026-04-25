const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const { HTTP_TIMEOUT_MS, HTTP_MAX_RETRIES } = require("../config/env");
const { UpstreamError } = require("../errors/AppError");
const logger = require("../logger");

function createClient(baseURL) {
  const client = axios.create({
    baseURL,
    timeout: HTTP_TIMEOUT_MS,
    validateStatus: () => true,
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

module.exports = { createClient, handleResponse };
