const app = require("./src/app");
const { PORT } = require("./src/config/env");
const logger = require("./src/logger");

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "server listening");
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal) {
  logger.info({ signal }, "shutdown requested");
  const timer = setTimeout(() => {
    logger.error("forced exit after shutdown timeout");
    process.exit(1);
  }, 10_000);
  timer.unref();

  server.close((err) => {
    if (err) {
      logger.error({ err }, "error during close");
      process.exit(1);
    }
    logger.info("server closed cleanly");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});
