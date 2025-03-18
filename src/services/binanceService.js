const axios = require("axios");
const { generateSignature } = require("../utils/hmac");
const BASE_URL = "https://api.binance.com";

exports.getAsset = async (recvWindow, apiKey, apiSecret) => {
    try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = generateSignature(queryString, apiSecret);
        const url = `${BASE_URL}/sapi/v3/asset/getUserAsset?${queryString}&signature=${signature}`;

        const headers = {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
        };

        const response = await axios.post(url, { asset: "USDT" }, { headers }); // replace USDT with dynamic asset if needed
        return response.data;
    } catch (error) {
        console.log("error : " + error.message)
        throw new Error(error.response ? error.response.data.msg : error.message);
    }
};

exports.placeMarketOrder = async (symbol, side, amount, apiKey, apiSecret) => {
    try {
        const timestamp = Date.now();

        const params = {
            symbol,
            side, // BUY or SELL
            type: "MARKET",
            timestamp
        };

        if (side === 'BUY') {
            params.quoteOrderQty = amount; // USDT for BUY
         } else if (side === 'SELL') {
            params.quantity = amount; // BTC for SELL
         }
         

        const queryString = new URLSearchParams(params).toString();
        const signature = generateSignature(queryString, apiSecret);

        const url = `${BASE_URL}/api/v3/order`;

        const headers = {
            "X-MBX-APIKEY": apiKey
        };

        const response = await axios.post(`${url}?${queryString}&signature=${signature}`, null, { headers });

        return response.data;
    } catch (error) {
        throw new Error(error.response ? error.response.data.msg : error.message);
    }
};

exports.orderDetail = async (orderId, symbol, recvWindow, apiKey, apiSecret) => {
    try {
        const timestamp = Date.now();

        // Include symbol in the params!
        const params = `orderId=${orderId}&symbol=${symbol}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = generateSignature(params, apiSecret);

        const url = `${BASE_URL}/api/v3/order?${params}&signature=${signature}`;

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

