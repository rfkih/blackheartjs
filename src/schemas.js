const { z } = require("zod");

// Null-tolerant default: defense in depth against Java callers that emit
// {"field":null} rather than omitting. zod's `.default()` triggers only on
// undefined; without this preprocessor a null recvWindow coerces to 0 and
// fails `positive()`.
const nullToUndefined = (v) => (v === null ? undefined : v);

const recvWindow = z.preprocess(
  nullToUndefined,
  z.coerce.number().int().positive().max(60_000).default(5_000),
);

const positiveNumberString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) > 0, {
    message: "must be a positive number",
  });

const symbol = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9]+$/, "symbol must be alphanumeric");

const apiKey = z.string().trim().min(1);
const apiSecret = z.string().trim().min(1);

// --- Tokocrypto ---
const getAssetQuery = z.object({
  asset: z.string().trim().min(1).max(20).default("IDR"),
  recvWindow,
  apiKey,
  apiSecret,
});

const tokocryptoPlaceOrderBody = z.object({
  symbol,
  // Tokocrypto uses numeric side: 0 = BUY, 1 = SELL
  side: z.coerce.number().int().refine((v) => v === 0 || v === 1, {
    message: "side must be 0 (BUY) or 1 (SELL)",
  }),
  amount: positiveNumberString,
  isQuoteQty: z.coerce.boolean().default(false),
  recvWindow,
  apiKey,
  apiSecret,
});

const tokocryptoOrderDetailBody = z.object({
  orderId: z.union([z.string(), z.number()]).transform(String),
  clientId: z.string().trim().optional(),
  recvWindow,
  apiKey,
  apiSecret,
});

// --- Binance ---
const binanceGetAssetBody = z.object({
  // Client may omit asset or send null — both mean "all assets".
  asset: z
    .preprocess((v) => (v === null || v === "" ? undefined : v),
      z.string().trim().min(1).max(20).optional()),
  recvWindow,
  apiKey,
  apiSecret,
});

const binancePlaceOrderBody = z.object({
  symbol,
  side: z.enum(["BUY", "SELL", "buy", "sell"]).transform((v) => v.toUpperCase()),
  amount: positiveNumberString,
  recvWindow,
  apiKey,
  apiSecret,
});

const binanceOrderDetailBody = z.object({
  orderId: z.union([z.string(), z.number()]).transform(String),
  symbol,
  recvWindow,
  apiKey,
  apiSecret,
});

// Null-tolerant: Java side emits null when postOnly=true (the gateway
// strips timeInForce in that branch anyway). Preprocess null → undefined
// so zod's default kicks in cleanly.
const timeInForce = z.preprocess(
  nullToUndefined,
  z.enum(["GTC", "IOC", "FOK"]).default("GTC"),
);

// Strict boolean coercion: z.coerce.boolean() treats every non-empty string
// (including "false") as true because Boolean("false") === true in JS. For a
// flag that controls LIMIT_MAKER vs LIMIT, that asymmetry is unsafe — silently
// turning a string "false" into postOnly=true would mis-route the order. Accept
// real booleans + the canonical "true"/"false" strings only.
const strictBoolean = (defaultValue) =>
  z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (v === "true") return true;
      if (v === "false") return false;
      return v;
    }, z.boolean())
    .default(defaultValue);

const binancePlaceLimitOrderBody = z.object({
  symbol,
  side: z.enum(["BUY", "SELL", "buy", "sell"]).transform((v) => v.toUpperCase()),
  price: positiveNumberString,
  quantity: positiveNumberString,
  timeInForce,
  // postOnly=true sends Binance type LIMIT_MAKER (rejects rather than crosses)
  postOnly: strictBoolean(false),
  // Optional client-supplied id for idempotent place/cancel.
  // Null-tolerant — Java callers that leave the field unset emit null.
  newClientOrderId: z.preprocess(
    nullToUndefined,
    z.string().trim().min(1).max(36).optional(),
  ),
  recvWindow,
  apiKey,
  apiSecret,
});

const binanceCancelOrderBody = z
  .object({
    symbol,
    // Either orderId OR origClientOrderId must be present; Binance accepts
    // either. Both fields are null-tolerant — Java callers emit null for
    // whichever they don't set.
    orderId: z.preprocess(
      nullToUndefined,
      z.union([z.string(), z.number()]).transform(String).optional(),
    ),
    origClientOrderId: z.preprocess(
      nullToUndefined,
      z.string().trim().min(1).max(36).optional(),
    ),
    recvWindow,
    apiKey,
    apiSecret,
  })
  .refine((d) => d.orderId || d.origClientOrderId, {
    message: "either orderId or origClientOrderId is required",
    path: ["orderId"],
  });

const binanceOpenOrdersBody = z.object({
  // symbol optional — omit to list across all symbols. Binance charges 40-weight when omitted.
  symbol: z.preprocess(nullToUndefined, symbol.optional()),
  recvWindow,
  apiKey,
  apiSecret,
});

module.exports = {
  getAssetQuery,
  tokocryptoPlaceOrderBody,
  tokocryptoOrderDetailBody,
  binanceGetAssetBody,
  binancePlaceOrderBody,
  binanceOrderDetailBody,
  binancePlaceLimitOrderBody,
  binanceCancelOrderBody,
  binanceOpenOrdersBody,
};
