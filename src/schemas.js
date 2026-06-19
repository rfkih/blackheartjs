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

// --- Binance Simple Earn (Flexible) ---
const optionalAsset = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().trim().min(1).max(20).optional(),
);
const productId = z.string().trim().min(1).max(64);
const optionalProductId = z.preprocess(nullToUndefined, productId.optional());
const optionalPage = z.preprocess(nullToUndefined, z.coerce.number().int().positive().optional());
const optionalEpochMs = z.preprocess(nullToUndefined, z.coerce.number().int().positive().optional());

const binanceEarnListBody = z.object({
  asset: optionalAsset,
  productId: optionalProductId,
  current: optionalPage,
  size: optionalPage,
  recvWindow,
  apiKey,
  apiSecret,
});

const binanceEarnSubscribeBody = z.object({
  productId,
  amount: positiveNumberString,
  // Default true mirrors Binance: re-subscribe rewards automatically.
  autoSubscribe: strictBoolean(true),
  // SPOT | FUND | ALL — where the principal is debited from.
  sourceAccount: z.preprocess(
    nullToUndefined,
    z.enum(["SPOT", "FUND", "ALL"]).optional(),
  ),
  recvWindow,
  apiKey,
  apiSecret,
});

const binanceEarnRedeemBody = z
  .object({
    productId,
    // Either redeemAll=true OR an explicit amount must be provided.
    redeemAll: strictBoolean(false),
    amount: z.preprocess(nullToUndefined, positiveNumberString.optional()),
    destAccount: z.preprocess(
      nullToUndefined,
      z.enum(["SPOT", "FUND", "ALL"]).optional(),
    ),
    recvWindow,
    apiKey,
    apiSecret,
  })
  .refine((d) => d.redeemAll === true || d.amount !== undefined, {
    message: "either redeemAll=true or a positive amount is required",
    path: ["amount"],
  });

const binanceEarnPositionBody = z.object({
  asset: optionalAsset,
  productId: optionalProductId,
  current: optionalPage,
  size: optionalPage,
  recvWindow,
  apiKey,
  apiSecret,
});

const binanceEarnRewardsBody = z.object({
  // Binance flexible rewardsRecord requires the reward type.
  type: z.enum(["BONUS", "REALTIME", "REWARDS"]),
  asset: optionalAsset,
  productId: optionalProductId,
  startTime: optionalEpochMs,
  endTime: optionalEpochMs,
  current: optionalPage,
  size: optionalPage,
  recvWindow,
  apiKey,
  apiSecret,
});

// --- Binance deposit history ---
const binanceDepositHistoryBody = z.object({
  // coin is required — the cost-basis caller always scopes to one asset (BTC).
  coin: z.string().trim().min(1).max(20),
  // Optional epoch-ms lower bound; null-tolerant for Java callers.
  startTime: optionalEpochMs,
  // Binance caps at 1000 rows/page; default to the max when omitted.
  limit: z.preprocess(
    nullToUndefined,
    z.coerce.number().int().positive().max(1000).default(1000),
  ),
  recvWindow,
  apiKey,
  apiSecret,
});

// --- Binance USDⓈ-M futures (perp leg for delta-neutral carry, Phase 1) ---
const optionalOrderId = z.preprocess(
  nullToUndefined,
  z.union([z.string(), z.number()]).transform(String).optional(),
);
const optionalSymbol = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  symbol.optional(),
);
const optionalClientOrderId = z.preprocess(
  nullToUndefined,
  z.string().trim().min(1).max(36).optional(),
);

const futuresPlaceMarketOrderBody = z.object({
  symbol,
  side: z.enum(["BUY", "SELL", "buy", "sell"]).transform((v) => v.toUpperCase()),
  // futures MARKET orders size in base units (quantity) for BOTH sides.
  quantity: positiveNumberString,
  // reduceOnly closes/reduces without flipping into the opposite side.
  reduceOnly: strictBoolean(false),
  // only meaningful in hedge mode; one-way mode omits it.
  positionSide: z.preprocess(
    nullToUndefined,
    z.enum(["BOTH", "LONG", "SHORT"]).optional(),
  ),
  newClientOrderId: optionalClientOrderId,
  recvWindow,
  apiKey,
  apiSecret,
});

const futuresOrderDetailBody = z
  .object({
    symbol,
    orderId: optionalOrderId,
    origClientOrderId: optionalClientOrderId,
    recvWindow,
    apiKey,
    apiSecret,
  })
  .refine((d) => d.orderId !== undefined || d.origClientOrderId !== undefined, {
    message: "either orderId or origClientOrderId is required",
    path: ["orderId"],
  });

const futuresCancelOrderBody = futuresOrderDetailBody;

const futuresAccountBody = z.object({ recvWindow, apiKey, apiSecret });

const futuresPositionRiskBody = z.object({
  symbol: optionalSymbol,
  recvWindow,
  apiKey,
  apiSecret,
});

// PUBLIC — mark price + funding; no API key required.
const futuresPremiumIndexBody = z.object({ symbol: optionalSymbol });

// PUBLIC — full futures contract specs (LOT_SIZE/MIN_NOTIONAL/precision); no
// API key. Symbol is accepted for parity but the upstream returns the full set.
const futuresExchangeInfoBody = z.object({ symbol: optionalSymbol });

// SIGNED — realized income history; carry funding accrual sums FUNDING_FEE.
const futuresIncomeBody = z.object({
  symbol: optionalSymbol,
  incomeType: z.string().trim().min(1).max(32).optional(),
  startTime: z.preprocess(nullToUndefined, z.coerce.number().int().positive().optional()),
  limit: z.preprocess(nullToUndefined, z.coerce.number().int().positive().max(1000).optional()),
  recvWindow,
  apiKey,
  apiSecret,
});

module.exports = {
  getAssetQuery,
  binanceDepositHistoryBody,
  futuresPlaceMarketOrderBody,
  futuresOrderDetailBody,
  futuresCancelOrderBody,
  futuresAccountBody,
  futuresPositionRiskBody,
  futuresPremiumIndexBody,
  futuresExchangeInfoBody,
  futuresIncomeBody,
  tokocryptoPlaceOrderBody,
  tokocryptoOrderDetailBody,
  binanceGetAssetBody,
  binancePlaceOrderBody,
  binanceOrderDetailBody,
  binancePlaceLimitOrderBody,
  binanceCancelOrderBody,
  binanceOpenOrdersBody,
  binanceEarnListBody,
  binanceEarnSubscribeBody,
  binanceEarnRedeemBody,
  binanceEarnPositionBody,
  binanceEarnRewardsBody,
};
