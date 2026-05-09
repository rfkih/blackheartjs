const WebSocket = require("ws");
const logger = require("../logger");

const BINANCE_WS_BASE = "wss://data-stream.binance.vision";

function attachWsProxy(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url, "ws://localhost");
    if (!pathname.startsWith("/stream") && !pathname.startsWith("/ws/")) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (clientWs, req) => {
    const upstreamUrl = BINANCE_WS_BASE + req.url;
    logger.info({ upstreamUrl }, "ws-proxy: connecting upstream");

    const upstream = new WebSocket(upstreamUrl);

    upstream.on("open", () => logger.info({ upstreamUrl }, "ws-proxy: upstream connected"));

    upstream.on("message", (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data, { binary: isBinary });
    });

    upstream.on("close", (code, reason) => {
      logger.info({ code }, "ws-proxy: upstream closed");
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code, reason);
    });

    upstream.on("error", (err) => {
      logger.error({ err }, "ws-proxy: upstream error");
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1011, "upstream error");
    });

    clientWs.on("message", (data, isBinary) => {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
    });

    clientWs.on("close", () => {
      if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });

    clientWs.on("error", (err) => {
      logger.error({ err }, "ws-proxy: client error");
      if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });
  });
}

module.exports = { attachWsProxy };
