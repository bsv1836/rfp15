const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  managerId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  contactNumber: { // Renamed from 'contact' to 'contactNumber'
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Unavailable', 'Busy'],
    default: 'Available'
  }
});

const Agent = mongoose.model('Agent', agentSchema);
module.exports = Agent;