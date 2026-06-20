const express = require("express");
const orderController = require("../controllers/orderController");
const validate = require("../middleware/validate");
const {
  tokocryptoPlaceOrderBody,
  tokocryptoOrderDetailBody,
  binancePlaceOrderBody,
  binanceOrderDetailBody,
  binancePlaceLimitOrderBody,
  binanceCancelOrderBody,
  binanceOpenOrdersBody,
  futuresPlaceMarketOrderBody,
  futuresOrderDetailBody,
  futuresCancelOrderBody,
  futuresAccountBody,
  futuresPositionRiskBody,
  futuresPremiumIndexBody,
  futuresExchangeInfoBody,
  futuresIncomeBody,
  futuresLeverageBody,
} = require("../schemas");

const router = express.Router();

router.post(
  "/place-market-order",
  validate({ body: tokocryptoPlaceOrderBody }),
  orderController.placeMarketOrder,
);

router.post(
  "/order-detail",
  validate({ body: tokocryptoOrderDetailBody }),
  orderController.orderDetail,
);

router.post(
  "/place-market-order-binance",
  validate({ body: binancePlaceOrderBody }),
  orderController.placeMarketOrderBinance,
);

router.post(
  "/order-detail-binance",
  validate({ body: binanceOrderDetailBody }),
  orderController.orderDetailBinance,
);

router.post(
  "/place-limit-order-binance",
  validate({ body: binancePlaceLimitOrderBody }),
  orderController.placeLimitOrderBinance,
);

router.post(
  "/cancel-order-binance",
  validate({ body: binanceCancelOrderBody }),
  orderController.cancelOrderBinance,
);

router.post(
  "/open-orders-binance",
  validate({ body: binanceOpenOrdersBody }),
  orderController.openOrdersBinance,
);

// --- Binance USDⓈ-M futures (perp leg for delta-neutral carry, Phase 1) ---
router.post(
  "/place-market-order-futures",
  validate({ body: futuresPlaceMarketOrderBody }),
  orderController.placeFuturesMarketOrderBinance,
);
router.post(
  "/order-detail-futures",
  validate({ body: futuresOrderDetailBody }),
  orderController.futuresOrderDetailBinance,
);
router.post(
  "/cancel-order-futures",
  validate({ body: futuresCancelOrderBody }),
  orderController.cancelFuturesOrderBinance,
);
router.post(
  "/account-futures",
  validate({ body: futuresAccountBody }),
  orderController.futuresAccountBinance,
);
router.post(
  "/position-risk-futures",
  validate({ body: futuresPositionRiskBody }),
  orderController.futuresPositionRiskBinance,
);
router.post(
  "/premium-index-futures",
  validate({ body: futuresPremiumIndexBody }),
  orderController.futuresPremiumIndexBinance,
);
router.post(
  "/exchange-info-futures",
  validate({ body: futuresExchangeInfoBody }),
  orderController.futuresExchangeInfoBinance,
);
router.post(
  "/income-futures",
  validate({ body: futuresIncomeBody }),
  orderController.futuresIncomeBinance,
);
router.post(
  "/leverage-futures",
  validate({ body: futuresLeverageBody }),
  orderController.setFuturesLeverageBinance,
);

module.exports = router;
