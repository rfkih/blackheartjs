const express = require("express");
const earnController = require("../controllers/earnController");
const validate = require("../middleware/validate");
const { SIMPLE_EARN_ENABLED } = require("../config/env");
const {
  binanceEarnListBody,
  binanceEarnSubscribeBody,
  binanceEarnRedeemBody,
  binanceEarnPositionBody,
  binanceEarnRewardsBody,
} = require("../schemas");

const router = express.Router();

// Safety belt: the fund-moving routes (subscribe/redeem) are gated behind
// SIMPLE_EARN_ENABLED (default false) and return 403 until explicitly enabled,
// so this ships dormant. Read-only routes (list/position/rewards) are always
// available. The 403 envelope matches the shape errorHandler/404 emit.
function requireEarnEnabled(req, res, next) {
  if (!SIMPLE_EARN_ENABLED) {
    return res.status(403).json({
      error: {
        code: "SIMPLE_EARN_DISABLED",
        message:
          "Simple Earn subscribe/redeem is disabled (set SIMPLE_EARN_ENABLED=true to enable)",
        requestId: req.id,
      },
    });
  }
  return next();
}

// Read-only
router.post(
  "/earn/flexible/list",
  validate({ body: binanceEarnListBody }),
  earnController.flexibleList,
);
router.post(
  "/earn/flexible/position",
  validate({ body: binanceEarnPositionBody }),
  earnController.flexiblePosition,
);
router.post(
  "/earn/flexible/rewards",
  validate({ body: binanceEarnRewardsBody }),
  earnController.flexibleRewards,
);

// Fund-moving — gated
router.post(
  "/earn/flexible/subscribe",
  requireEarnEnabled,
  validate({ body: binanceEarnSubscribeBody }),
  earnController.flexibleSubscribe,
);
router.post(
  "/earn/flexible/redeem",
  requireEarnEnabled,
  validate({ body: binanceEarnRedeemBody }),
  earnController.flexibleRedeem,
);

module.exports = router;
