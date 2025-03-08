const tokocryptoService = require("../services/tokocryptoService");

exports.placeMarketOrder = async (req, res) => {
    try {
        const { symbol, side, amount, isQuoteQty, apiKey, apiSecret } = req.body;

        // Validate input
        if (!symbol || side === undefined || !amount) {
            return res.status(400).json({ error: "Missing required parameters: symbol, side, amount" });
        }

        const orderResponse = await tokocryptoService.placeMarketOrder(symbol, side, amount, isQuoteQty, apiKey, apiSecret);
        res.json(orderResponse);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Endpoint to query order details
 */
exports.orderDetail = async (req, res) => {
    try {
        const { orderId, clientId, recvWindow, apiKey, apiSecret } = req.body;

        // Validate input
        if (!orderId || !apiSecret) {
            return res.status(400).json({ error: "Missing required parameters: symbol, side, amount" });
        }

        const orderResponse = await tokocryptoService.orderDetail(orderId, clientId, recvWindow, apiKey, apiSecret);
        res.json(orderResponse);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
