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
    
    const attendanceCount = await mongoose.connection.db.collection('attendances').countDocuments();
    const absentCount = await mongoose.connection.db.collection('attendances').countDocuments({ status: { $regex: /^absent$/i } });
    const memberCount = await Member.countDocuments();
    const sanctionCount = await mongoose.connection.db.collection('sanction').countDocuments();
    console.log({ attendanceCount, absentCount, memberCount, sanctionCount });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
