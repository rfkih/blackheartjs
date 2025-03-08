require("dotenv").config();

module.exports = {
    PORT: process.env.PORT || 3000,
    BASE_URL: process.env.BASE_URL,
    API_KEY: process.env.API_KEY,
    API_SECRET: process.env.API_SECRET
};
