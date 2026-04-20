const { z } = require("zod");

const recvWindow = z.coerce.number().int().positive().max(60_000).default(5_000);

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

module.exports = {
  getAssetQuery,
  tokocryptoPlaceOrderBody,
  tokocryptoOrderDetailBody,
  binanceGetAssetBody,
  binancePlaceOrderBody,
  binanceOrderDetailBody,
};
