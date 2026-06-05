process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
// SIMPLE_EARN_ENABLED intentionally unset → defaults false (dormant).

const request = require("supertest");

jest.mock("../src/services/binanceService", () => ({
  getAsset: jest.fn(),
  placeMarketOrder: jest.fn(),
  orderDetail: jest.fn(),
  placeLimitOrder: jest.fn(),
  cancelOrder: jest.fn(),
  openOrders: jest.fn(),
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

describe("read-only Simple Earn routes (always available)", () => {
  it("POST /api/earn/flexible/list forwards", async () => {
    binance.simpleEarnFlexibleList.mockResolvedValue({ rows: [{ productId: "USDT001", asset: "USDT" }] });
    const res = await request(app)
      .post("/api/earn/flexible/list")
      .send({ asset: "usdt", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleList).toHaveBeenCalledWith(
      expect.objectContaining({ asset: "usdt", apiKey: VALID_KEY, apiSecret: VALID_SECRET }),
    );
  });

  it("POST /api/earn/flexible/position forwards", async () => {
    binance.simpleEarnFlexiblePosition.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post("/api/earn/flexible/position")
      .send({ asset: "USDT", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexiblePosition).toHaveBeenCalled();
  });

  it("POST /api/earn/flexible/rewards forwards with a valid type", async () => {
    binance.simpleEarnFlexibleRewards.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post("/api/earn/flexible/rewards")
      .send({ type: "REALTIME", asset: "USDT", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleRewards.mock.calls[0][0].type).toBe("REALTIME");
  });

  it("rewards rejects a missing/invalid type", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/rewards")
      .send({ asset: "USDT", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(binance.simpleEarnFlexibleRewards).not.toHaveBeenCalled();
  });

  it("list accepts null asset (treats as all-assets)", async () => {
    binance.simpleEarnFlexibleList.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post("/api/earn/flexible/list")
      .send({ asset: null, apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleList.mock.calls[0][0].asset).toBeUndefined();
  });

  it("list rejects missing apiKey", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/list")
      .send({ asset: "USDT", apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
  });
});

describe("fund-moving routes are gated OFF by default", () => {
  it("POST /api/earn/flexible/subscribe returns 403 SIMPLE_EARN_DISABLED", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/subscribe")
      .send({ productId: "USDT001", amount: "100", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SIMPLE_EARN_DISABLED");
    expect(binance.simpleEarnFlexibleSubscribe).not.toHaveBeenCalled();
  });

  it("POST /api/earn/flexible/redeem returns 403 SIMPLE_EARN_DISABLED", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/redeem")
      .send({ productId: "USDT001", redeemAll: true, apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SIMPLE_EARN_DISABLED");
    expect(binance.simpleEarnFlexibleRedeem).not.toHaveBeenCalled();
  });
});
