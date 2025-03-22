const axios = require("axios");
const crypto = require("crypto");
const { generateSignature } = require("../utils/hmac");
const BASE_URL = "https://www.tokocrypto.com";
const tokocryptoService = require("../services/tokocryptoService");

exports.getAsset = async (asset, recvWindow, apiKey , apiSecret) => {
    try {
        const timestamp = Date.now();
        const queryString = `asset=${asset}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = generateSignature(queryString, apiSecret);
        const url = `${BASE_URL}/open/v1/account/spot/asset?${queryString}&signature=${signature}`;
        const finalUrl = `${BASE_URL}/open/v1/account/spot/asset?${queryString}&signature=${signature}`;

        const headers = { "X-MBX-APIKEY": apiKey };

        const response = await axios.get(finalUrl, { headers });
        return response.data;
    } catch (error) {
        console.log("error : " + error.message)
        throw new Error(error.response ? error.response.data.message : error.message);
    }
};

exports.placeMarketOrder = async (symbol, side, amount, isQuoteQty, apiKey, apiSecret) => {
    try {
        const timestamp = Date.now();
        let params = {
            symbol,
            side,  // 0 = Buy, 1 = Sell
            type: 2,  // 2 = Market Order
            timestamp,
            newOrderRespType: "FULL" // FULL RESPONSE TYPE
        };

        // Use `quantity` for SELL orders, and `quoteOrderQty` for BUY orders
        if (isQuoteQty) {
            params.quoteOrderQty = amount;
        } else {
            params.quantity = amount;
        }

        // Generate HMAC SHA256 Signature
        const queryString = new URLSearchParams(params).toString();
        const signature =  generateSignature(queryString, apiSecret);

        params.signature = signature;

        // Send HTTP request to Tokocrypto API
        const response = await axios.post(`${BASE_URL}/open/v1/orders`, null, {
            headers: {
                "X-MBX-APIKEY": apiKey
            },
            params
        });

        return response.data;
    } catch (error) {
        throw new Error(error.response ? error.response.data.message : error.message);
    }
};


/**
 * Fetch order details.
 */
exports.orderDetail = async (orderId, clientId, recvWindow, apiKey, apiSecret) => {
    try {
    
        const timestamp = Date.now();

        // Build query parameters
        let params = `orderId=${orderId}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
        if (clientId) {
            params += `&clientId=${clientId}`;
        }

        // Generate HMAC signature
        const signature = generateSignature(params, apiSecret);
        params += `&signature=${signature}`;

        const url = `${BASE_URL}/open/v1/orders/detail?${params}`;

        const headers = {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json",
        };

        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching order details:", error.response ? error.response.data : error.message);
        return { error: error.response ? error.response.data : error.message };
    }
};