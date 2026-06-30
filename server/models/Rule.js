const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  meeting: { type: Number, required: true, default: 50 },
  major_event: { type: Number, required: true, default: 100 },
  special_event: { type: Number, required: true, default: 150 }
});

module.exports = mongoose.model('Rule', ruleSchema);
