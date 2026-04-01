const axios = require("axios");
const { generateSignature } = require("../utils/hmac");
const BASE_URL = "https://api.binance.com";


async function getServerTimeOffset() {
  const res = await axios.get(`${BASE_URL}/api/v3/time`);
  const serverTime = res.data.serverTime;
  const localTime = Date.now();
  return serverTime - localTime;
}

exports.getAsset = async (recvWindow, apiKey, apiSecret) => {
    try {
        const offset = await getServerTimeOffset();
        const timestamp = Date.now() + offset;

        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = generateSignature(queryString, apiSecret);
        const url = `${BASE_URL}/sapi/v3/asset/getUserAsset?${queryString}&signature=${signature}`;

        const headers = {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
        };

        const response = await axios.post(url, { asset: "USDT" }, { headers });
        return response.data;
    } catch (error) {
        console.log("error : " + error.message)
        throw new Error(error.response ? error.response.data.msg : error.message);
    }
};


exports.placeMarketOrder = async (symbol, side, amount, apiKey, apiSecret) => {
    try {
        const params = {
            symbol: String(symbol).toUpperCase().trim(),
            side: String(side).toUpperCase().trim(),
            type: "MARKET",
            recvWindow: 5000,
            timestamp: Date.now()
        };

        if (params.side === "BUY") {
            params.quoteOrderQty = amount;
        } else if (params.side === "SELL") {
            params.quantity = amount;
        } else {
            throw new Error("side must be BUY or SELL");
        }

        const cleanApiKey = String(apiKey).trim();
        const cleanApiSecret = String(apiSecret).trim();

        const queryString = new URLSearchParams(params).toString();
        const signature = generateSignature(queryString, cleanApiSecret);

    

        const response = await axios.post(
            `${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`,
            null,
            {
                headers: {
                    "X-MBX-APIKEY": cleanApiKey
                }
            }
        );

        console.log("response : " + response.data)

        return response.data;
    } catch (error) {
        console.log("status:", error.response?.status);
        console.log("data:", error.response?.data);
        throw new Error(error.response?.data?.msg || error.message);
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

