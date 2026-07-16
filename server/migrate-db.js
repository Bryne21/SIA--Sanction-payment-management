const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanction_payment';
    console.log('Connecting to database:', uri.slice(0, 50) + '...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const db = mongoose.connection.db;

    // Clear 'sanction' collection
    const deleteResult = await db.collection('sanction').deleteMany({});
    console.log(`Cleared sanction collection (deleted ${deleteResult.deletedCount} documents).`);

    // Reset 'attendances' collection processed flags
    const updateResult = await db.collection('attendances').updateMany(
      {},
      { $unset: { processed: "", processedAt: "", memberId: "" } }
    );
    console.log(`Reset ${updateResult.modifiedCount} attendance documents.`);

    console.log('Database migration completed successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
