const { parseBigIntSafe } = require("../src/services/httpClient");

// Regression for the 2026-06-22 naked-carry-leg incident: a futures orderId
// above 2^53 was corrupted by float64 JSON.parse (...508123 -> ...508000), so
// every order-detail/cancel lookup 404'd and the perp leg looked "failed" after
// it had filled. parseBigIntSafe must keep int64 ids as exact strings.
describe("parseBigIntSafe — int64 precision preservation", () => {
  test("preserves a futures orderId beyond 2^53 as an exact string", () => {
    const raw =
      '{"orderId":8389766214563508123,"status":"NEW","avgPrice":"0.00","cumQuote":"21.16"}';
    const out = parseBigIntSafe(raw);
    expect(out.orderId).toBe("8389766214563508123");
    expect(out.status).toBe("NEW");
    expect(out.cumQuote).toBe("21.16");
  });

  test("leaves safe integers (timestamps, small ints) and floats as numbers", () => {
    const out = parseBigIntSafe('{"serverTime":1782135311933,"count":5,"qty":0.012}');
    expect(out.serverTime).toBe(1782135311933);
    expect(out.count).toBe(5);
    expect(out.qty).toBe(0.012);
  });

  test("catches every big id in an array in one pass", () => {
    const out = parseBigIntSafe(
      '[{"id":8389766214563508123},{"id":8389766214563508999}]',
    );
    expect(out[0].id).toBe("8389766214563508123");
    expect(out[1].id).toBe("8389766214563508999");
  });

  test("does not touch all-digit values that are already JSON strings", () => {
    const out = parseBigIntSafe(
      '{"clientOrderId":"1234567890123456","orderId":8389766214563508123}',
    );
    expect(out.clientOrderId).toBe("1234567890123456");
    expect(out.orderId).toBe("8389766214563508123");
  });

  test("strict-parses genuine non-JSON to a throw (handled by caller)", () => {
    expect(() => parseBigIntSafe("<html>error</html>")).toThrow();
  });
});
