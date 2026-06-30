const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Models
const Member = require('./models/Member');
const Ledger = require('./models/Ledger');
const Rule = require('./models/Rule');
const AuditLog = require('./models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanction_payment';
const DB_PATH = path.join(__dirname, 'data.json');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected successfully to:', MONGODB_URI);
    
    // Run seed migration
    await seedDataIfNeeded();
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const seedDataIfNeeded = async () => {
  try {
    const memberCount = await Member.countDocuments();
    const ledgerCount = await Ledger.countDocuments();
    const ruleCount = await Rule.countDocuments();
    const auditCount = await AuditLog.countDocuments();

    // If database already contains data, skip seeding
    if (memberCount > 0 || ledgerCount > 0 || ruleCount > 0 || auditCount > 0) {
      console.log('Database already has data. Skipping migration.');
      return;
    }

    // Check if data.json exists
    if (!fs.existsSync(DB_PATH)) {
      console.log('No local data.json file found to seed. Creating default rule.');
      await Rule.create({ meeting: 50, major_event: 100, special_event: 150 });
      return;
    }

    console.log('No data found in MongoDB. Starting migration from data.json...');
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(rawData);

    // Seeding members
    if (db.members && db.members.length > 0) {
      await Member.insertMany(db.members);
      console.log(`Migrated ${db.members.length} members.`);
    }

    // Seeding ledger
    if (db.ledger && db.ledger.length > 0) {
      await Ledger.insertMany(db.ledger);
      console.log(`Migrated ${db.ledger.length} ledger transactions.`);
    }

    // Seeding rules
    if (db.rules) {
      await Rule.create({
        meeting: db.rules.meeting || 50,
        major_event: db.rules.major_event || 100,
        special_event: db.rules.special_event || 150
      });
      console.log('Migrated sanction rule settings.');
    } else {
      await Rule.create({ meeting: 50, major_event: 100, special_event: 150 });
    }

    // Seeding audit logs
    if (db.auditLogs && db.auditLogs.length > 0) {
      await AuditLog.insertMany(db.auditLogs);
      console.log(`Migrated ${db.auditLogs.length} audit logs.`);
    }

    console.log('Database migration and seeding completed successfully!');
  } catch (err) {
    console.error('Error during data migration:', err);
  }
};

module.exports = { connectDB };
