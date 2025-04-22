const mongoose = require('mongoose');

const fuelInventorySchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  fuelType: {
    type: String,
    required: true
  },
  quantityAvailable: {
    type: Number,
    required: true
  },
  price: { // Add price field
    type: Number,
    required: true
  }
});


module.exports = mongoose.model('FuelInventory', fuelInventorySchema);
