const mongoose = require("mongoose");
const Order = require("../models/Order");


const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  fuelType: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Delivered"],
    default: "Pending",
  },
  fuelStation: {
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  },
});

module.exports = mongoose.model("Order", orderSchema);
