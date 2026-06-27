const express = require("express");
const assetController = require("../controllers/assetController");
const validate = require("../middleware/validate");
const { getAssetQuery, binanceGetAssetBody, binanceTransferBody } = require("../schemas");

const router = express.Router();

router.get("/get-asset", validate({ query: getAssetQuery }), assetController.getAsset);
router.post(
  "/get-asset-binance",
  validate({ body: binanceGetAssetBody }),
  assetController.getAssetBinance,
);
router.post(
  "/transfer-binance",
  validate({ body: binanceTransferBody }),
  assetController.transferBinance,
);

module.exports = router;
