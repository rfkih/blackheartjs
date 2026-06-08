process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
// Enable the feature BEFORE app/env is required (env parses once at require-time).
process.env.FULL_BALANCE_ENABLED = "true";

const request = require("supertest");

jest.mock("../src/services/binanceService", () => ({
  getAsset: jest.fn(),
  placeMarketOrder: jest.fn(),
  orderDetail: jest.fn(),
  placeLimitOrder: jest.fn(),
  cancelOrder: jest.fn(),
  openOrders: jest.fn(),
  depositHistory: jest.fn(),
  simpleEarnFlexibleList: jest.fn(),
  simpleEarnFlexibleSubscribe: jest.fn(),
  simpleEarnFlexibleRedeem: jest.fn(),
  simpleEarnFlexiblePosition: jest.fn(),
  simpleEarnFlexibleRewards: jest.fn(),
}));

const app = require("../src/app");
const binance = require("../src/services/binanceService");

const VALID_KEY = "k";
const VALID_SECRET = "s";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/binance/deposit-history (enabled)", () => {
  it("returns the raw Binance deposit array and forwards coin + creds", async () => {
    const deposits = [
      { amount: "0.5", coin: "BTC", insertTime: 1700000000000, txId: "tx-1", status: 1 },
    ];
    binance.depositHistory.mockResolvedValue(deposits);

    const res = await request(app)
      .post("/api/binance/deposit-history")
      .send({ coin: "btc", apiKey: VALID_KEY, apiSecret: VALID_SECRET });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(deposits);
    expect(binance.depositHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        coin: "btc",
        limit: 1000,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      }),
    );
  });

  it("forwards an explicit startTime and limit", async () => {
    binance.depositHistory.mockResolvedValue([]);
    const res = await request(app)
      .post("/api/binance/deposit-history")
      .send({ coin: "BTC", startTime: 1690000000000, limit: 50, apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(binance.depositHistory.mock.calls[0][0].startTime).toBe(1690000000000);
    expect(binance.depositHistory.mock.calls[0][0].limit).toBe(50);
  });

  it("rejects a missing coin", async () => {
    const res = await request(app)
      .post("/api/binance/deposit-history")
      .send({ apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(binance.depositHistory).not.toHaveBeenCalled();
  });

  it("rejects a missing apiKey", async () => {
    const res = await request(app)
      .post("/api/binance/deposit-history")
      .send({ coin: "BTC", apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
    expect(binance.depositHistory).not.toHaveBeenCalled();
  });
});
