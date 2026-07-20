const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Admin-SchoolOrg' });
    const db = mongoose.connection.db;
    const docs = await db.collection('sanction').find({}).limit(10).toArray();
    console.log('sanction docs sample:');
    console.dir(docs, { depth: 4 });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
