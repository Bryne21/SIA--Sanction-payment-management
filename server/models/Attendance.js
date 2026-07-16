const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    attendanceId: { type: String, unique: true, sparse: true },
    memberId: { type: String },
    studentId: { type: String },
    date: { type: String, required: true },
    status: { type: String, required: true, default: 'absent' },
    eventType: { type: String, default: 'meeting' },
    description: { type: String, default: '' },
    processed: { type: Boolean, default: false },
    processedAt: { type: String, default: '' },
    source: { type: String, default: '' }
  },
  {
    collection: 'attendances',
    timestamps: true
  }
);

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
