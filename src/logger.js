const pino = require("pino");
const { LOG_LEVEL, isProd } = require("./config/env");

const redactPaths = [
  'req.headers.authorization',
  'req.headers["x-exchange-api-key"]',
  'req.headers["x-exchange-api-secret"]',
  "req.body.apiKey",
  "req.body.apiSecret",
  "req.query.apiKey",
  "req.query.apiSecret",
  "*.apiKey",
  "*.apiSecret",
  "*.signature",
];

const logger = pino({
  level: LOG_LEVEL,
  redact: { paths: redactPaths, censor: "[redacted]" },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true, translateTime: "SYS:HH:MM:ss" },
        },
      }),
});

module.exports = logger;
