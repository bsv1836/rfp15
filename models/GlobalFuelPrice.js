// models/GlobalFuelPrice.js
const mongoose = require("mongoose");

const globalFuelPriceSchema = new mongoose.Schema({
  fuelType: { type: String, required: true },
  price: { type: Number, required: true },
});

module.exports = mongoose.model("GlobalFuelPrice", globalFuelPriceSchema);
