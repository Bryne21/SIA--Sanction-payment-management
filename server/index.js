const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Schemas and Models
const memberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. "M001"
  name: { type: String, required: true },
  email: { type: String, required: true },
  balance: { type: Number, required: true, default: 0 },
  totalPaid: { type: Number, required: true, default: 0 },
  standing: { type: String, required: true, default: 'Good Standing' }
});
const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);

const ledgerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. "TX001"
  memberId: { type: String, required: true }, // e.g. "M001"
  type: { type: String, required: true, enum: ['fine', 'payment'] },
  amount: { type: Number, required: true },
  event: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD HH:MM format
  reference: { type: String, default: '' }
});
const Ledger = mongoose.models.Ledger || mongoose.model('Ledger', ledgerSchema);

const ruleSchema = new mongoose.Schema({
  meeting: { type: Number, required: true, default: 50 },
  major_event: { type: Number, required: true, default: 100 },
  special_event: { type: Number, required: true, default: 150 }
});
const Rule = mongoose.models.Rule || mongoose.model('Rule', ruleSchema);



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
    // If database already contains data, skip seeding
    if (memberCount > 0 || ledgerCount > 0 || ruleCount > 0) {
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



    console.log('Database migration and seeding completed successfully!');
  } catch (err) {
    console.error('Error during data migration:', err);
  }
};

const app = express();
const PORT = process.env.PORT || 5000;
const STANDING_THRESHOLD = 150;

app.use(cors());
app.use(express.json());

// Helper to format date
const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// Helper to get next Ledger ID in format TX###
const getNextTxId = async () => {
  const lastTx = await Ledger.findOne({ id: /^TX\d+$/ }).sort({ id: -1 });
  if (!lastTx) return 'TX001';
  const num = parseInt(lastTx.id.replace('TX', '')) || 0;
  return `TX${String(num + 1).padStart(3, '0')}`;
};



// Helper to get current state
const getState = async () => {
  const members = await Member.find().lean();
  const ledger = await Ledger.find().lean();
  let rulesDoc = await Rule.findOne().lean();
  if (!rulesDoc) {
    rulesDoc = { meeting: 50, major_event: 100, special_event: 150 };
  }
  // Strip mongoose private keys (_id and __v) for pristine frontend compatibility
  const cleanMembers = members.map(({ _id, __v, ...m }) => m);
  const cleanLedger = ledger.map(({ _id, __v, ...l }) => l);
  const cleanRules = {
    meeting: rulesDoc.meeting,
    major_event: rulesDoc.major_event,
    special_event: rulesDoc.special_event
  };

  return {
    members: cleanMembers,
    ledger: cleanLedger,
    rules: cleanRules
  };
};

// 1. Get full state
app.get('/api/state', async (req, res) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error('Error fetching state:', error);
    res.status(500).json({ error: 'Database read failed' });
  }
});

// 2. Log Infraction (Log unexcused absence, assess fine, update status)
app.post('/api/infraction', async (req, res) => {
  const { memberId, eventType, customEventName } = req.body;
  
  if (!memberId || !eventType || !customEventName) {
    return res.status(400).json({ error: 'Missing required parameters: memberId, eventType, and customEventName are required.' });
  }

  if (typeof memberId !== 'string' || memberId.trim() === '') {
    return res.status(400).json({ error: 'Invalid member ID.' });
  }
  
  const validEventTypes = ['meeting', 'major_event', 'special_event'];
  if (!validEventTypes.includes(eventType)) {
    return res.status(400).json({ error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}` });
  }

  if (typeof customEventName !== 'string' || customEventName.trim().length < 3 || customEventName.trim().length > 100) {
    return res.status(400).json({ error: 'Event description must be a string between 3 and 100 characters.' });
  }

  const trimmedEventName = customEventName.trim();

  try {
    const member = await Member.findOne({ id: memberId.trim() });
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    let rulesDoc = await Rule.findOne();
    if (!rulesDoc) {
      rulesDoc = await Rule.create({ meeting: 50, major_event: 100, special_event: 150 });
    }

    const fineAmount = rulesDoc[eventType] || 50;
    const eventLabel = eventType === "meeting" ? "Meeting" : eventType === "major_event" ? "Major Event" : "Special Event";
    const eventName = `Unexcused Absence - ${eventLabel} (${trimmedEventName})`;
    const txDate = getFormattedDate();

    // Update balance and standing
    member.balance += fineAmount;
    if (member.balance >= STANDING_THRESHOLD) {
      member.standing = "Not in Good Standing";
    }
    await member.save();

    // Create transaction
    const newTxId = await getNextTxId();
    await Ledger.create({
      id: newTxId,
      memberId: member.id,
      type: 'fine',
      amount: fineAmount,
      event: eventName,
      date: txDate,
      reference: ''
    });



    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error('Error processing infraction:', error);
    res.status(500).json({ error: 'Database write failed' });
  }
});

// 3. Process payment
app.post('/api/payment', async (req, res) => {
  const { memberId, amount, type, reference } = req.body;

  if (!memberId || amount === undefined || !type) {
    return res.status(400).json({ error: 'Missing required parameters: memberId, amount, and type are required.' });
  }

  const payAmt = parseFloat(amount);
  if (isNaN(payAmt) || payAmt <= 0) {
    return res.status(400).json({ error: 'Payment amount must be a positive number greater than 0.' });
  }

  const validTypes = ['cash', 'receipt'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Payment type must be either "cash" or "receipt".' });
  }

  if (type === 'receipt') {
    if (!reference || typeof reference !== 'string' || reference.trim().length < 5) {
      return res.status(400).json({ error: 'Digital receipt payments require a reference code of at least 5 characters.' });
    }
  }

  try {
    const member = await Member.findOne({ id: memberId.trim() });
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    if (payAmt > member.balance) {
      return res.status(400).json({ error: `Payment of ₱${payAmt} exceeds outstanding balance of ₱${member.balance}.` });
    }

    const txDate = getFormattedDate();
    const refCode = type === 'cash' ? `CASH-${member.id}-${Date.now().toString().slice(-4)}` : reference.trim();
    const eventName = `Payment Received - ${type === 'cash' ? 'Cash' : 'Digital Receipt'}`;

    // Update member balance and totalPaid
    member.balance -= payAmt;
    member.totalPaid += payAmt;
    if (member.balance < STANDING_THRESHOLD) {
      member.standing = "Good Standing";
    }
    await member.save();

    // Add ledger entry
    const newTxId = await getNextTxId();
    await Ledger.create({
      id: newTxId,
      memberId: member.id,
      type: 'payment',
      amount: payAmt,
      event: eventName,
      date: txDate,
      reference: refCode
    });



    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Database write failed' });
  }
});

// 4. Update Rule Policy
app.post('/api/rules', async (req, res) => {
  const { meeting, major_event, special_event } = req.body;
  
  if (meeting === undefined && major_event === undefined && special_event === undefined) {
    return res.status(400).json({ error: 'No rules values provided for update.' });
  }

  const validateRuleVal = (val, name) => {
    if (val !== undefined) {
      const num = Number(val);
      if (!Number.isInteger(num) || num < 0 || num > 10000) {
        throw new Error(`${name} fine must be a whole number between 0 and 10,000.`);
      }
      return num;
    }
    return undefined;
  };

  let parsedMeeting, parsedMajor, parsedSpecial;
  try {
    parsedMeeting = validateRuleVal(meeting, 'Meeting');
    parsedMajor = validateRuleVal(major_event, 'Major Event');
    parsedSpecial = validateRuleVal(special_event, 'Special Event');
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    let rulesDoc = await Rule.findOne();
    if (!rulesDoc) {
      rulesDoc = new Rule();
    }
    if (parsedMeeting !== undefined) rulesDoc.meeting = parsedMeeting;
    if (parsedMajor !== undefined) rulesDoc.major_event = parsedMajor;
    if (parsedSpecial !== undefined) rulesDoc.special_event = parsedSpecial;
    await rulesDoc.save();



    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error('Error updating rules:', error);
    res.status(500).json({ error: 'Database write failed' });
  }
});

// Connect to database then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Express Sanction Backend running at http://localhost:${PORT}`);
  });
});
