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

module.exports = router;
