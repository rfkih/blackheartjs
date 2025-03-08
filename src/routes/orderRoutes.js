const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/place-market-order", orderController.placeMarketOrder);
router.post("/order-detail", orderController.orderDetail);

module.exports = router;
