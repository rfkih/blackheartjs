require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const BASE_URL = "https://www.tokocrypto.com";

app.get('/get-asset', async (req, res) => {
    try {
        const asset = req.query.asset || 'IDR';
        const recvWindow = req.query.recvWindow || 5000;
        const apiKey = req.query.apiKey;
        const apiSecret = req.query.apiSecret
        const timestamp = Date.now();
    

        const queryString = `asset=${asset}&timestamp=${timestamp}&recvWindow=${recvWindow}`;

        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(queryString)
            .digest('hex');

        const finalUrl = `${BASE_URL}/open/v1/account/spot/asset?${queryString}&signature=${signature}`;

        const headers = {
            'X-MBX-APIKEY': apiKey,
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        };


        const response = await axios.get(finalUrl, { headers });

        res.json(response.body);
    } catch (error) {
        console.error("❌ Error calling API:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.response ? error.response.data : error.message });
    }
});

// ✅ Start Express server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
