const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Admin-SchoolOrg' });
    const db = mongoose.connection.db;
    const att = await db.collection('attendances').findOne({ status: { $regex: /^Absent$/i } });
    console.log('attendance sample:', att);
    const eventsCollectionName = (await db.listCollections({ name: 'event-data' }).hasNext()) ? 'event-data' : 'events-data';
    console.log('eventsCollectionName:', eventsCollectionName);
    const eventId = att.event;
    console.log('attendance.event type:', typeof eventId, eventId);
    const eventDoc = await db.collection(eventsCollectionName).findOne({ _id: eventId });
    console.log('eventDoc by _id:', eventDoc);
    const titleDoc = await db.collection(eventsCollectionName).findOne({ title: 'JPICE Seminar' });
    console.log('eventDoc by title JPICE Seminar:', titleDoc);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
