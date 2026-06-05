process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
// Enable the fund-moving routes BEFORE app/env is required (env parses once).
process.env.SIMPLE_EARN_ENABLED = "true";

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

describe("POST /api/earn/flexible/subscribe (enabled)", () => {
  it("forwards a valid subscribe with default autoSubscribe=true", async () => {
    binance.simpleEarnFlexibleSubscribe.mockResolvedValue({ success: true, purchaseId: 1 });
    const res = await request(app)
      .post("/api/earn/flexible/subscribe")
      .send({ productId: "USDT001", amount: "100", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "USDT001", amount: "100", autoSubscribe: true }),
    );
  });

  it("rejects missing productId", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/subscribe")
      .send({ amount: "100", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
    expect(binance.simpleEarnFlexibleSubscribe).not.toHaveBeenCalled();
  });

  it("rejects non-positive amount", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/subscribe")
      .send({ productId: "USDT001", amount: "0", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
  });

  it("respects sourceAccount enum and explicit autoSubscribe=false", async () => {
    binance.simpleEarnFlexibleSubscribe.mockResolvedValue({ success: true });
    const res = await request(app)
      .post("/api/earn/flexible/subscribe")
      .send({
        productId: "USDT001", amount: "50", autoSubscribe: false, sourceAccount: "SPOT",
        apiKey: VALID_KEY, apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleSubscribe.mock.calls[0][0].autoSubscribe).toBe(false);
    expect(binance.simpleEarnFlexibleSubscribe.mock.calls[0][0].sourceAccount).toBe("SPOT");
  });
});

describe("POST /api/earn/flexible/redeem (enabled)", () => {
  it("forwards redeemAll=true", async () => {
    binance.simpleEarnFlexibleRedeem.mockResolvedValue({ success: true, redeemId: 9 });
    const res = await request(app)
      .post("/api/earn/flexible/redeem")
      .send({ productId: "USDT001", redeemAll: true, apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleRedeem.mock.calls[0][0].redeemAll).toBe(true);
  });

  it("forwards a partial redeem by amount", async () => {
    binance.simpleEarnFlexibleRedeem.mockResolvedValue({ success: true });
    const res = await request(app)
      .post("/api/earn/flexible/redeem")
      .send({ productId: "USDT001", amount: "25", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleRedeem.mock.calls[0][0].amount).toBe("25");
  });

  it("accepts null amount when redeemAll is true (Java wire-format)", async () => {
    binance.simpleEarnFlexibleRedeem.mockResolvedValue({ success: true });
    const res = await request(app)
      .post("/api/earn/flexible/redeem")
      .send({ productId: "USDT001", redeemAll: true, amount: null, apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.simpleEarnFlexibleRedeem.mock.calls[0][0].amount).toBeUndefined();
  });

  it("rejects when neither redeemAll nor amount is provided", async () => {
    const res = await request(app)
      .post("/api/earn/flexible/redeem")
      .send({ productId: "USDT001", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(binance.simpleEarnFlexibleRedeem).not.toHaveBeenCalled();
  });
});
