const { API_SECRET } = require("../config/env");
const tokocryptoService = require("../services/tokocryptoService");

exports.getAsset = async (req, res) => {
    try {
        const asset = req.query.asset || "IDR";
        const recvWindow = req.query.recvWindow || 5000;
        const apiKey = req.query.apiKey;
        const apiSecret = req.query.apiSecret;
        const data = await tokocryptoService.getAsset(asset, recvWindow, apiKey, apiSecret);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
