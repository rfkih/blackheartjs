const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { placeMarketOrderBinance, orderDetailBinance } = require('../controllers/orderController');


router.post("/place-market-order", orderController.placeMarketOrder);
router.post("/order-detail", orderController.orderDetail);
router.post("/place-market-order-binance", placeMarketOrderBinance);
router.post("/order-detail-binance", orderDetailBinance);

module.exports = router;
