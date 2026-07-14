const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Ledger = require('../models/Ledger');
const Rule = require('../models/Rule');

const DB_PATH = path.join(__dirname, '..', 'data.json');

const STANDING_THRESHOLD = 150;

const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const getNextTxId = async () => {
  const lastTx = await Ledger.findOne({ id: /^TX\d+$/ }).sort({ id: -1 });
  if (!lastTx) return 'TX001';
  const num = parseInt(lastTx.id.replace('TX', '')) || 0;
  return `TX${String(num + 1).padStart(3, '0')}`;
};

const getState = async () => {
  try {
    // If mongoose is not connected, skip DB calls to avoid buffering/timeouts
    if (mongoose.connection.readyState !== 1) {
      throw new Error('mongoose-not-connected');
    }

    const members = await Member.find().lean();
    const ledger = await Ledger.find().lean();
    let rulesDoc = await Rule.findOne().lean();
    if (!rulesDoc) {
      rulesDoc = { meeting: 50, major_event: 100, special_event: 150 };
    }

    if (Array.isArray(members) && members.length > 0) {
      const cleanMembers = members.map(({ _id, __v, ...m }) => m);
      const cleanLedger = ledger.map(({ _id, __v, ...l }) => l);
      return {
        members: cleanMembers,
        ledger: cleanLedger,
        rules: {
          meeting: rulesDoc.meeting,
          major_event: rulesDoc.major_event,
          special_event: rulesDoc.special_event
        }
      };
    }
    // If DB returned no members, fall through to file fallback
  } catch (err) {
    if (err && err.message === 'mongoose-not-connected') {
      console.warn('getState: mongoose not connected, using data.json fallback');
    } else {
      console.warn('getState: failed to read from MongoDB, falling back to data.json', err && err.message);
    }
  }

  // Fallback: read from local data.json if present
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        members: parsed.members || [],
        ledger: parsed.ledger || [],
        rules: parsed.rules || { meeting: 50, major_event: 100, special_event: 150 }
      };
    }
  } catch (fileErr) {
    console.error('getState: failed to read fallback data.json', fileErr);
  }

  // Ultimate fallback: empty state
  return {
    members: [],
    ledger: [],
    rules: { meeting: 50, major_event: 100, special_event: 150 }
  };
};

const handleGetState = async (req, res) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error('Error fetching state:', error);
    res.status(500).json({ error: 'Database read failed' });
  }
};

const handleLogInfraction = async (req, res) => {
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
    const eventLabel = eventType === 'meeting' ? 'Meeting' : eventType === 'major_event' ? 'Major Event' : 'Special Event';
    const eventName = `Unexcused Absence - ${eventLabel} (${trimmedEventName})`;
    const txDate = getFormattedDate();

    member.balance += fineAmount;
    if (member.balance >= STANDING_THRESHOLD) {
      member.standing = 'Not in Good Standing';
    }
    await member.save();

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
};

const handleProcessPayment = async (req, res) => {
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

    member.balance -= payAmt;
    member.totalPaid += payAmt;
    if (member.balance < STANDING_THRESHOLD) {
      member.standing = 'Good Standing';
    }
    await member.save();

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
};

const handleUpdateRules = async (req, res) => {
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

  try {
    const parsedMeeting = validateRuleVal(meeting, 'Meeting');
    const parsedMajor = validateRuleVal(major_event, 'Major Event');
    const parsedSpecial = validateRuleVal(special_event, 'Special Event');

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
    if (error.message && error.message.includes('fine must be a whole number')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error updating rules:', error);
    res.status(500).json({ error: 'Database write failed' });
  }
};

module.exports = {
  handleGetState,
  handleLogInfraction,
  handleProcessPayment,
  handleUpdateRules
};
