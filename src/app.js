const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const { createProxyMiddleware } = require("http-proxy-middleware");

const logger = require("./logger");
const {
  CORS_ORIGINS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
} = require("./config/env");

const requestId = require("./middleware/requestId");
const errorHandler = require("./middleware/errorHandler");

const assetRoutes = require("./routes/assetRoutes");
const orderRoutes = require("./routes/orderRoutes");
const healthRoutes = require("./routes/healthRoutes");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGINS === "*" ? true : CORS_ORIGINS,
    credentials: false,
  }),
);
app.use(express.json({ limit: "64kb" }));

app.use("/", healthRoutes);

// Transparent passthrough to Binance spot REST. Lets the JVM call
// http://<gateway>:8088/api/v3/* and have it forwarded to
// https://api.binance.com/api/v3/* — which is the workaround for home
// ISP networks that DNS-hijack api.binance.com. Path is preserved as-is.
//
// Mounted BEFORE the rate-limited /api block so passthrough doesn't
// share a counter with our own /api/get-asset etc. routes. Binance
// enforces its own rate limits server-side and returns 429/418, which
// the JVM's resilience4j circuit-breaker already handles.
//
// SECURITY NOTE: this opens an arbitrary forwarder. Anyone reaching the
// gateway can hit any /api/v3/* path on Binance through it. Gateway is
// bound to 127.0.0.1 on the host (compose port mapping) and only sibling
// containers on the compose network can hit it — acceptable for now.
// Add a path-allowlist (klines, ticker, exchangeInfo) before exposing
// the gateway beyond the compose network.
app.use(
  "/api/v3",
  createProxyMiddleware({
    target: "https://api.binance.com",
    changeOrigin: true,
    // path is /api/v3/<rest> already — the proxy preserves it.
    pathRewrite: (path) => `/api/v3${path}`,
    logger,
  }),
);

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api", assetRoutes);
app.use("/api", orderRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}`, requestId: req.id },
  });
});

app.use(errorHandler);

module.exports = app;
