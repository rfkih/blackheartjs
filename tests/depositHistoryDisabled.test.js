process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
// FULL_BALANCE_ENABLED intentionally unset → defaults false (dormant).

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

describe("deposit-history route is gated OFF by default", () => {
  it("POST /api/binance/deposit-history returns [] and does not call upstream", async () => {
    const res = await request(app)
      .post("/api/binance/deposit-history")
      .send({ coin: "BTC", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(binance.depositHistory).not.toHaveBeenCalled();
  });
});
