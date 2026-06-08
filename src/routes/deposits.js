const express = require("express");
const depositController = require("../controllers/depositController");
const validate = require("../middleware/validate");
const { FULL_BALANCE_ENABLED } = require("../config/env");
const { binanceDepositHistoryBody } = require("../schemas");

const router = express.Router();

// Feature gate: the full-balance hedge support route ships dormant. When
// FULL_BALANCE_ENABLED is false we short-circuit to an empty array (NOT a 403)
// so the JVM CostBasisService cleanly falls back to current-price cost basis
// without an error path. Mirrors the earn route's env gating, but the deposit
// route is read-only so the disabled response is an empty payload, not a reject.
function depositHistoryGate(req, res, next) {
  if (!FULL_BALANCE_ENABLED) {
    return res.json([]);
  }
  return next();
}

// POST (creds in the body) to match every other JVM-facing Binance route in
// this gateway (place-market-order-binance, order-detail-binance, earn/*). The
// underlying Binance call is a signed GET to /sapi/v1/capital/deposit/hisrec.
router.post(
  "/binance/deposit-history",
  depositHistoryGate,
  validate({ body: binanceDepositHistoryBody }),
  depositController.depositHistory,
);

module.exports = router;
