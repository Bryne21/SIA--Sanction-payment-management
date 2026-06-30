const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. "TX001"
  memberId: { type: String, required: true }, // e.g. "M001"
  type: { type: String, required: true, enum: ['fine', 'payment'] },
  amount: { type: Number, required: true },
  event: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD HH:MM format
  reference: { type: String, default: '' }
});

module.exports = mongoose.model('Ledger', ledgerSchema);
