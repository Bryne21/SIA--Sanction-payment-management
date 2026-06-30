const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. "A001"
  type: { type: String, required: true }, // e.g. "fine_generated", "payment_received", "rule_updated"
  message: { type: String, required: true },
  timestamp: { type: String, required: true }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
