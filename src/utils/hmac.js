const crypto = require("crypto");

exports.generateSignature = (queryString, secretKey) => {
    return crypto
        .createHmac("sha256", secretKey)
        .update(queryString)
        .digest("hex");
};
