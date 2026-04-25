const express = require("express");

const router = express.Router();
const startedAt = Date.now();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", uptimeMs: Date.now() - startedAt });
});

router.get("/readyz", (_req, res) => {
  res.json({ status: "ready" });
});

module.exports = router;
