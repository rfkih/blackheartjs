process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

const request = require("supertest");

jest.mock("../src/services/tokocryptoService", () => ({
  getAsset: jest.fn(),
  placeMarketOrder: jest.fn(),
  orderDetail: jest.fn(),
}));
jest.mock("../src/services/binanceService", () => ({
  getAsset: jest.fn(),
  placeMarketOrder: jest.fn(),
  orderDetail: jest.fn(),
  placeLimitOrder: jest.fn(),
  cancelOrder: jest.fn(),
  openOrders: jest.fn(),
}));
jest.mock("../src/services/binanceFuturesService", () => ({
  placeFuturesMarketOrder: jest.fn(),
  futuresOrderDetail: jest.fn(),
  cancelFuturesOrder: jest.fn(),
  futuresAccount: jest.fn(),
  futuresPositionRisk: jest.fn(),
  premiumIndex: jest.fn(),
}));

const app = require("../src/app");
const futures = require("../src/services/binanceFuturesService");

const KEY = "k";
const SECRET = "s";

beforeEach(() => jest.clearAllMocks());

describe("POST /api/place-market-order-futures", () => {
  it("forwards a valid SHORT (SELL) market order with quantity", async () => {
    futures.placeFuturesMarketOrder.mockResolvedValue({ orderId: 9, status: "NEW" });
    const res = await request(app)
      .post("/api/place-market-order-futures")
      .send({ symbol: "BTCUSDT", side: "SELL", quantity: "0.01", apiKey: KEY, apiSecret: SECRET });
    expect(res.status).toBe(200);
    expect(futures.placeFuturesMarketOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "BTCUSDT", side: "SELL", quantity: "0.01", reduceOnly: false }),
    );
  });

  it("passes reduceOnly through for closing a perp leg", async () => {
    futures.placeFuturesMarketOrder.mockResolvedValue({ orderId: 10, status: "NEW" });
    const res = await request(app)
      .post("/api/place-market-order-futures")
      .send({ symbol: "ETHUSDT", side: "BUY", quantity: "0.1", reduceOnly: true, apiKey: KEY, apiSecret: SECRET });
    expect(res.status).toBe(200);
    expect(futures.placeFuturesMarketOrder).toHaveBeenCalledWith(
      expect.objectContaining({ reduceOnly: true }),
    );
  });

  it("rejects a missing quantity (400) and never calls the service", async () => {
    const res = await request(app)
      .post("/api/place-market-order-futures")
      .send({ symbol: "BTCUSDT", side: "SELL", apiKey: KEY, apiSecret: SECRET });
    expect(res.status).toBe(400);
    expect(futures.placeFuturesMarketOrder).not.toHaveBeenCalled();
  });

  it("rejects a bad side (400)", async () => {
    const res = await request(app)
      .post("/api/place-market-order-futures")
      .send({ symbol: "BTCUSDT", side: "HODL", quantity: "0.01", apiKey: KEY, apiSecret: SECRET });
    expect(res.status).toBe(400);
  });
});

describe("futures read endpoints", () => {
  it("position-risk forwards optional symbol", async () => {
    futures.futuresPositionRisk.mockResolvedValue([{ symbol: "BTCUSDT", positionAmt: "-0.01" }]);
    const res = await request(app)
      .post("/api/position-risk-futures")
      .send({ symbol: "BTCUSDT", apiKey: KEY, apiSecret: SECRET });
    expect(res.status).toBe(200);
    expect(futures.futuresPositionRisk).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "BTCUSDT" }),
    );
  });

  it("premium-index is public (no apiKey required)", async () => {
    futures.premiumIndex.mockResolvedValue({ symbol: "BTCUSDT", markPrice: "60000", lastFundingRate: "0.0001" });
    const res = await request(app)
      .post("/api/premium-index-futures")
      .send({ symbol: "BTCUSDT" });
    expect(res.status).toBe(200);
    expect(futures.premiumIndex).toHaveBeenCalledWith(expect.objectContaining({ symbol: "BTCUSDT" }));
  });

  it("account-futures requires apiKey/apiSecret (400 without)", async () => {
    const res = await request(app).post("/api/account-futures").send({});
    expect(res.status).toBe(400);
  });
});
