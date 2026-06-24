process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
// Force a deterministic retry budget for the policy assertions below.
process.env.HTTP_MAX_RETRIES = "2";

const { createClient } = require("../src/services/httpClient");

// Drive the retry policy by replacing the transport adapter with a counter that
// simulates a transport reset (network error). axios-retry sits ABOVE the
// adapter, so the number of adapter invocations === 1 + actual retries.
function clientThatAlwaysNetworkErrors() {
  const client = createClient("https://example.test");
  let attempts = 0;
  client.defaults.adapter = async (config) => {
    attempts += 1;
    const err = new Error("socket hang up");
    err.code = "ECONNRESET"; // a retryable network error per axios-retry
    err.config = config;
    err.request = {};
    err.isAxiosError = true;
    throw err;
  };
  return { client, getAttempts: () => attempts };
}

describe("httpClient retry policy — order POSTs must NOT auto-retry", () => {
  it("does NOT retry a spot order-placement POST (/api/v3/order)", async () => {
    const { client, getAttempts } = clientThatAlwaysNetworkErrors();
    await expect(
      client.post("/api/v3/order?symbol=BTCUSDT", null),
    ).rejects.toBeDefined();
    // One attempt only: a re-sent market order could execute a SECOND fill.
    expect(getAttempts()).toBe(1);
  });

  it("does NOT retry a futures order-placement POST (/fapi/v1/order)", async () => {
    const { client, getAttempts } = clientThatAlwaysNetworkErrors();
    await expect(
      client.post("/fapi/v1/order?symbol=BTCUSDT", null),
    ).rejects.toBeDefined();
    expect(getAttempts()).toBe(1);
  });

  it("DOES retry a read-only GET (account / positionRisk / premiumIndex)", async () => {
    const { client, getAttempts } = clientThatAlwaysNetworkErrors();
    await expect(client.get("/fapi/v2/account")).rejects.toBeDefined();
    // 1 initial + 2 retries (HTTP_MAX_RETRIES=2) = 3 attempts.
    expect(getAttempts()).toBe(3);
  });
});
