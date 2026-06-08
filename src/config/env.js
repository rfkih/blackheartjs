require("dotenv").config();

const { z } = require("zod");

const csv = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8088),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  TOKOCRYPTO_BASE_URL: z.string().url().default("https://www.tokocrypto.com"),
  BINANCE_BASE_URL: z.string().url().default("https://api.binance.com"),

  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  HTTP_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

  CORS_ORIGINS: z.string().default("*"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

  // Safety belt: the FUND-MOVING Simple Earn routes (subscribe/redeem) are
  // disabled by default and return 403 until explicitly enabled. Read-only
  // earn routes (list/position/rewards) are always available. Strict parse —
  // only the literal "true" enables it (avoids the Boolean("false")===true trap).
  SIMPLE_EARN_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),

  // Gates the full-balance hedge support routes (deposit-history). Disabled by
  // default — the deposit-history route returns an empty array [] until this is
  // explicitly enabled, so the feature ships dormant. Strict parse like
  // SIMPLE_EARN_ENABLED (avoids the Boolean("false")===true trap).
  FULL_BALANCE_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  CORS_ORIGINS: env.CORS_ORIGINS === "*" ? "*" : csv(env.CORS_ORIGINS),
  isProd: env.NODE_ENV === "production",
};
