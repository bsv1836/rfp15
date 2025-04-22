const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const managerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  fuelStation: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    fuelTypes: [{ type: String }],
  },
});

// Password comparison
managerSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Manager", managerSchema);
