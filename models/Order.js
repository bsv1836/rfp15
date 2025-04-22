const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true }, // Link to manager
  customerName: { type: String, required: true }, // Add customer name
  fuelType: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Delivered", "Confirmed"],
    default: "Confirmed",
  },
  fuelStation: {
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  },
  paymentMethod: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);