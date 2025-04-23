const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" }, // Added for agent assignment
  customerName: { type: String, required: true },
  fuelType: { type: String, required: true },
  quantity: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  address: { type: String, required: true }, // Added address field
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "In Progress", "Delivered", "Rejected", "Cancelled"],
    default: "Pending",
  },
  fuelStation: {
    managerId: { type: String, required: true }, // Changed to String to match usage
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);