const express = require("express");
const router = express.Router();
const assetController = require("../controllers/assetController");

// Define routes
router.get("/get-asset", assetController.getAsset);

module.exports = router;  // ✅ Ensure only the router is exported
