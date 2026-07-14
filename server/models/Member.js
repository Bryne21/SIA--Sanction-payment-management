const mongoose = require('mongoose');

// Member schema used by the controllers and frontend.
// Fields: id, name, email, balance, totalPaid, standing
const memberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    balance: { type: Number, required: true, default: 0 },
    totalPaid: { type: Number, required: true, default: 0 },
    standing: { type: String, required: true, default: 'Good Standing' }
  },
  {
    collection: 'members',
    timestamps: true
  }
);

module.exports = mongoose.models.Member || mongoose.model('Member', memberSchema);
