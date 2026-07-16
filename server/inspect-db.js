const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Member = require('./models/Member');
const Attendance = require('./models/Attendance');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('connected');
    const attendanceCount = await Attendance.countDocuments();
    const absentCount = await Attendance.countDocuments({ status: { $regex: /^absent$/i } });
    const firstAbsent = await Attendance.findOne({ status: { $regex: /^absent$/i } }).lean();
    const memberCount = await Member.countDocuments();
    console.log({ attendanceCount, absentCount, memberCount });
    console.log('firstAbsent', JSON.stringify(firstAbsent, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
