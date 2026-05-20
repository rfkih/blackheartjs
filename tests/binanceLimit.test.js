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

const app = require("../src/app");
const binance = require("../src/services/binanceService");

const VALID_KEY = "k";
const VALID_SECRET = "s";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/place-limit-order-binance", () => {
  it("forwards a valid LIMIT order with default GTC + postOnly=false", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 1, status: "NEW" });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000.00",
        quantity: "0.001",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000.00",
        quantity: "0.001",
        timeInForce: "GTC",
        postOnly: false,
      }),
    );
  });

  it("upper-cases lowercase side", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 2 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "sell",
        price: "60000",
        quantity: "0.002",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].side).toBe("SELL");
  });

  it("forwards postOnly=true (LIMIT_MAKER intent)", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 3 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        postOnly: true,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].postOnly).toBe(true);
  });

  // Bug #7 regression: prior z.coerce.boolean() treated string "false" as
  // truthy (Boolean("false") === true). Strict coercion must preserve the
  // literal "false" → false intent.
  it("treats postOnly string \"false\" as false (not truthy)", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 31 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        postOnly: "false",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].postOnly).toBe(false);
  });

  it("treats postOnly string \"true\" as true", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 32 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        postOnly: "true",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].postOnly).toBe(true);
  });

  // Wire-format regression: Java's Jackson by default emits {"field":null}
  // for unset fields. Gateway zod must accept null-as-undefined for optional
  // fields so Java callers don't 400 on every LIMIT_MAKER call.
  it("accepts null timeInForce (treats as default GTC)", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 41 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        timeInForce: null,
        postOnly: true,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].timeInForce).toBe("GTC");
  });

  it("accepts null recvWindow (treats as default 5000)", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 42 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        recvWindow: null,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].recvWindow).toBe(5000);
  });

  it("accepts null newClientOrderId", async () => {
    binance.placeLimitOrder.mockResolvedValue({ orderId: 43 });
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        newClientOrderId: null,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.placeLimitOrder.mock.calls[0][0].newClientOrderId).toBeUndefined();
  });

  it("rejects postOnly with non-boolean string", async () => {
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        postOnly: "yes",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects missing price", async () => {
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        quantity: "0.001",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(binance.placeLimitOrder).not.toHaveBeenCalled();
  });

  it("rejects non-positive price", async () => {
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "0",
        quantity: "0.001",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
  });

  it("rejects bad timeInForce", async () => {
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "50000",
        quantity: "0.001",
        timeInForce: "DAY",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
  });

  it("propagates upstream 400 (e.g. LIMIT_MAKER would cross)", async () => {
    const { UpstreamError } = require("../src/errors/AppError");
    binance.placeLimitOrder.mockRejectedValue(
      new UpstreamError("Order would immediately match and take.", {
        status: 400,
        code: "UPSTREAM_ERROR",
        details: { upstreamStatus: 400, upstreamBody: { code: -2010 } },
      }),
    );
    const res = await request(app)
      .post("/api/place-limit-order-binance")
      .send({
        symbol: "BTCUSDT",
        side: "BUY",
        price: "999999",
        quantity: "0.001",
        postOnly: true,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPSTREAM_ERROR");
  });
});

describe("POST /api/cancel-order-binance", () => {
  it("forwards a valid cancel by orderId", async () => {
    binance.cancelOrder.mockResolvedValue({ orderId: 1, status: "CANCELED" });
    const res = await request(app)
      .post("/api/cancel-order-binance")
      .send({
        symbol: "BTCUSDT",
        orderId: "1",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.cancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "BTCUSDT", orderId: "1" }),
    );
  });

  it("forwards a valid cancel by origClientOrderId", async () => {
    binance.cancelOrder.mockResolvedValue({ status: "CANCELED" });
    const res = await request(app)
      .post("/api/cancel-order-binance")
      .send({
        symbol: "BTCUSDT",
        origClientOrderId: "bh-abc",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.cancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ origClientOrderId: "bh-abc" }),
    );
  });

  // Wire-format regression: Java emits null for whichever id is unset.
  it("accepts null origClientOrderId when orderId is set", async () => {
    binance.cancelOrder.mockResolvedValue({ status: "CANCELED" });
    const res = await request(app)
      .post("/api/cancel-order-binance")
      .send({
        symbol: "BTCUSDT",
        orderId: "123",
        origClientOrderId: null,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.cancelOrder.mock.calls[0][0].orderId).toBe("123");
    expect(binance.cancelOrder.mock.calls[0][0].origClientOrderId).toBeUndefined();
  });

  it("accepts null orderId when origClientOrderId is set", async () => {
    binance.cancelOrder.mockResolvedValue({ status: "CANCELED" });
    const res = await request(app)
      .post("/api/cancel-order-binance")
      .send({
        symbol: "BTCUSDT",
        orderId: null,
        origClientOrderId: "bh-x",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(200);
    expect(binance.cancelOrder.mock.calls[0][0].origClientOrderId).toBe("bh-x");
    expect(binance.cancelOrder.mock.calls[0][0].orderId).toBeUndefined();
  });

  it("rejects when both are null", async () => {
    const res = await request(app)
      .post("/api/cancel-order-binance")
      .send({
        symbol: "BTCUSDT",
        orderId: null,
        origClientOrderId: null,
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects when neither orderId nor origClientOrderId present", async () => {
    const res = await request(app)
      .post("/api/cancel-order-binance")
      .send({
        symbol: "BTCUSDT",
        apiKey: VALID_KEY,
        apiSecret: VALID_SECRET,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(binance.cancelOrder).not.toHaveBeenCalled();
  });
});

describe("POST /api/open-orders-binance", () => {
  it("forwards with optional symbol", async () => {
    binance.openOrders.mockResolvedValue([{ orderId: 1 }]);
    const res = await request(app)
      .post("/api/open-orders-binance")
      .send({ symbol: "BTCUSDT", apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.openOrders).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "BTCUSDT" }),
    );
  });

  it("forwards without symbol (cross-symbol listing)", async () => {
    binance.openOrders.mockResolvedValue([]);
    const res = await request(app)
      .post("/api/open-orders-binance")
      .send({ apiKey: VALID_KEY, apiSecret: VALID_SECRET });
    expect(res.status).toBe(200);
    expect(binance.openOrders).toHaveBeenCalled();
  });

  it("rejects missing apiKey", async () => {
    const res = await request(app)
      .post("/api/open-orders-binance")
      .send({ apiSecret: VALID_SECRET });
    expect(res.status).toBe(400);
  });
});
