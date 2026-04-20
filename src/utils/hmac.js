const { createHmac } = require("crypto");

function generateSignature(queryString, secretKey) {
  return createHmac("sha256", secretKey).update(queryString).digest("hex");
}

module.exports = { generateSignature };
