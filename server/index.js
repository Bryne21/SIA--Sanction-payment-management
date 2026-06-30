const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./db');

// Models
const Member = require('./models/Member');
const Ledger = require('./models/Ledger');
const Rule = require('./models/Rule');
const AuditLog = require('./models/AuditLog');

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

// Helper to get next AuditLog ID in format A###
const getNextAuditId = async () => {
  const lastAudit = await AuditLog.findOne({ id: /^A\d+$/ }).sort({ id: -1 });
  if (!lastAudit) return 'A001';
  const num = parseInt(lastAudit.id.replace('A', '')) || 0;
  return `A${String(num + 1).padStart(3, '0')}`;
};

// Helper to get current state
const getState = async () => {
  const members = await Member.find().lean();
  const ledger = await Ledger.find().lean();
  let rulesDoc = await Rule.findOne().lean();
  if (!rulesDoc) {
    rulesDoc = { meeting: 50, major_event: 100, special_event: 150 };
  }
  const auditLogs = await AuditLog.find().sort({ _id: -1 }).lean();
  
  // Strip mongoose private keys (_id and __v) for pristine frontend compatibility
  const cleanMembers = members.map(({ _id, __v, ...m }) => m);
  const cleanLedger = ledger.map(({ _id, __v, ...l }) => l);
  const cleanRules = {
    meeting: rulesDoc.meeting,
    major_event: rulesDoc.major_event,
    special_event: rulesDoc.special_event
  };
  const cleanAuditLogs = auditLogs.map(({ _id, __v, ...a }) => a);

  return {
    members: cleanMembers,
    ledger: cleanLedger,
    rules: cleanRules,
    auditLogs: cleanAuditLogs
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
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const member = await Member.findOne({ id: memberId });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    let rulesDoc = await Rule.findOne();
    if (!rulesDoc) {
      rulesDoc = await Rule.create({ meeting: 50, major_event: 100, special_event: 150 });
    }

    const fineAmount = rulesDoc[eventType] || 50;
    const eventLabel = eventType === "meeting" ? "Meeting" : eventType === "major_event" ? "Major Event" : "Special Event";
    const eventName = `Unexcused Absence - ${eventLabel} (${customEventName})`;
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

    // Create audit log
    const newAuditId = await getNextAuditId();
    await AuditLog.create({
      id: newAuditId,
      type: 'fine_generated',
      message: `Generated fine of ₱${fineAmount} for ${member.name} (${eventName})`,
      timestamp: txDate
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
  const payAmt = parseFloat(amount);

  if (!memberId || isNaN(payAmt) || payAmt <= 0 || !type) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const member = await Member.findOne({ id: memberId });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (payAmt > member.balance) {
      return res.status(400).json({ error: 'Payment exceeds outstanding balance' });
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

    // Add audit log
    const newAuditId = await getNextAuditId();
    await AuditLog.create({
      id: newAuditId,
      type: 'payment_received',
      message: `Processed payment of ₱${payAmt} for ${member.name} (Ref: ${refCode})`,
      timestamp: txDate
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
  
  try {
    let rulesDoc = await Rule.findOne();
    if (!rulesDoc) {
      rulesDoc = new Rule();
    }
    if (meeting !== undefined) rulesDoc.meeting = parseInt(meeting) || 0;
    if (major_event !== undefined) rulesDoc.major_event = parseInt(major_event) || 0;
    if (special_event !== undefined) rulesDoc.special_event = parseInt(special_event) || 0;
    await rulesDoc.save();

    const txDate = getFormattedDate();
    const newAuditId = await getNextAuditId();
    await AuditLog.create({
      id: newAuditId,
      type: 'rule_updated',
      message: `Updated sanction fine amount rules - Meeting: ₱${rulesDoc.meeting}, Major Event: ₱${rulesDoc.major_event}, Special Event: ₱${rulesDoc.special_event}`,
      timestamp: txDate
    });

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
