const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Member = require('./models/Member');
const Attendance = require('./models/Attendance');
const Ledger = require('./models/Ledger');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('connected');
    const attendanceCount = await Attendance.countDocuments();
    const absentCount = await Attendance.countDocuments({ status: { $regex: /^absent$/i } });
    const firstAbsent = await Attendance.findOne({ status: { $regex: /^absent$/i } }).lean();
    const memberCount = await Member.countDocuments();
    const ledgerCount = await Ledger.countDocuments();
    console.log({ attendanceCount, absentCount, memberCount, ledgerCount });
    console.log('firstAbsent', JSON.stringify(firstAbsent, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
