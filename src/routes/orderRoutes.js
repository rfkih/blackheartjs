const express = require("express");
const orderController = require("../controllers/orderController");
const validate = require("../middleware/validate");
const {
  tokocryptoPlaceOrderBody,
  tokocryptoOrderDetailBody,
  binancePlaceOrderBody,
  binanceOrderDetailBody,
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

module.exports = router;
