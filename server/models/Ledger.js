const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },
  type: { type: String, required: true, enum: ['fine', 'payment'] },
  amount: { type: Number, required: true },
  event: { type: String, required: true },
  date: { type: String, required: true },
  reference: { type: String, default: '' }
});

module.exports = mongoose.models.Ledger || mongoose.model('Ledger', ledgerSchema);
