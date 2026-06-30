const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. "M001"
  name: { type: String, required: true },
  email: { type: String, required: true },
  balance: { type: Number, required: true, default: 0 },
  totalPaid: { type: Number, required: true, default: 0 },
  standing: { type: String, required: true, default: 'Good Standing' }
});

module.exports = mongoose.model('Member', memberSchema);
