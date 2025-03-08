const express = require("express");
const app = express();
const assetRoutes = require("./routes/assetRoutes");
const orderRoutes = require("./routes/orderRoutes");


// Middleware
app.use(express.json());

// Register routes
app.use("/api", assetRoutes);
app.use("/api", orderRoutes);

console.log("✅ App.js Loaded...");

module.exports = app;
