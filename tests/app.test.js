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
}));

const app = require("../src/app");
const tokocrypto = require("../src/services/tokocryptoService");
const binance = require("../src/services/binanceService");

describe("health", () => {
  it("GET /healthz returns 200", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("validation", () => {
  it("rejects requests missing apiKey/apiSecret", async () => {
    const res = await request(app).post("/api/get-asset-binance").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a bad symbol on market order", async () => {
    const res = await request(app)
      .post("/api/place-market-order-binance")
      .send({ symbol: "bad-sym!", side: "BUY", amount: "10", apiKey: "k", apiSecret: "s" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("happy path", () => {
  it("forwards a valid Binance asset lookup", async () => {
    binance.getAsset.mockResolvedValue([{ asset: "USDT", free: "1.0" }]);
    const res = await request(app)
      .post("/api/get-asset-binance")
      .send({ asset: "USDT", apiKey: "k", apiSecret: "s" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ asset: "USDT", free: "1.0" }]);
    expect(binance.getAsset).toHaveBeenCalledWith(
      expect.objectContaining({ asset: "USDT", apiKey: "k", apiSecret: "s" }),
    );
  });

  it("forwards a Tokocrypto order detail", async () => {
    tokocrypto.orderDetail.mockResolvedValue({ orderId: "1" });
    const res = await request(app)
      .post("/api/order-detail")
      .send({ orderId: "1", apiKey: "k", apiSecret: "s" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orderId: "1" });
  });
});
