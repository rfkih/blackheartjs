const { generateSignature } = require("../src/utils/hmac");

describe("generateSignature", () => {
  it("matches a known HMAC-SHA256 digest", () => {
    // Reference value computed with OpenSSL: hmac-sha256("secret", "hello") =
    // 88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b
    expect(generateSignature("hello", "secret")).toBe(
      "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b",
    );
  });

  it("produces different signatures for different secrets", () => {
    expect(generateSignature("abc", "k1")).not.toBe(generateSignature("abc", "k2"));
  });
});
