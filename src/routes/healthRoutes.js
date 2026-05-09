const express = require("express");
const axios = require("axios");

const router = express.Router();
const startedAt = Date.now();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", uptimeMs: Date.now() - startedAt });
});

router.get("/readyz", (_req, res) => {
  res.json({ status: "ready" });
});

router.get("/server-ip", async (_req, res, next) => {
  try {
    const { data: ip } = await axios.get("https://api.ipify.org?format=text", { timeout: 5000 });
    res.json({ ip: ip.trim() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
