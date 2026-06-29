const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DB_PATH = path.join(__dirname, 'data.json');
const STANDING_THRESHOLD = 150;

app.use(cors());
app.use(express.json());

// Helper to read DB
const readDB = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { members: [], ledger: [], rules: { meeting: 50, major_event: 100, special_event: 150 }, auditLogs: [] };
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data.json:', error);
    return { members: [], ledger: [], rules: { meeting: 50, major_event: 100, special_event: 150 }, auditLogs: [] };
  }
};

// Helper to write DB
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing data.json:', error);
    return false;
  }
};

// Helper to format date
const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// 1. Get full state
app.get('/api/state', (req, res) => {
  res.json(readDB());
});

// 2. Log Infraction (Log unexcused absence, assess fine, update status)
app.post('/api/infraction', (req, res) => {
  const { memberId, eventType, customEventName } = req.body;
  if (!memberId || !eventType || !customEventName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const db = readDB();
  const member = db.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const fineAmount = db.rules[eventType] || 50;
  const eventLabel = eventType === "meeting" ? "Meeting" : eventType === "major_event" ? "Major Event" : "Special Event";
  const eventName = `Unexcused Absence - ${eventLabel} (${customEventName})`;
  const txDate = getFormattedDate();

  // Update balance and standing
  member.balance += fineAmount;
  if (member.balance >= STANDING_THRESHOLD) {
    member.standing = "Not in Good Standing";
  }

  // Create transaction
  const newTx = {
    id: `TX${String(db.ledger.length + 1).padStart(3, '0')}`,
    memberId: member.id,
    type: 'fine',
    amount: fineAmount,
    event: eventName,
    date: txDate,
    reference: ''
  };
  db.ledger.push(newTx);

  // Create audit log
  const newAudit = {
    id: `A${String(db.auditLogs.length + 1).padStart(3, '0')}`,
    type: 'fine_generated',
    message: `Generated fine of ₱${fineAmount} for ${member.name} (${eventName})`,
    timestamp: txDate
  };
  db.auditLogs.unshift(newAudit); // add to top of logs

  if (writeDB(db)) {
    res.json(db);
  } else {
    res.status(500).json({ error: 'Database write failed' });
  }
});

// 3. Process payment
app.post('/api/payment', (req, res) => {
  const { memberId, amount, type, reference } = req.body;
  const payAmt = parseFloat(amount);

  if (!memberId || isNaN(payAmt) || payAmt <= 0 || !type) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const db = readDB();
  const member = db.members.find(m => m.id === memberId);
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

  // Add ledger entry
  const newTx = {
    id: `TX${String(db.ledger.length + 1).padStart(3, '0')}`,
    memberId: member.id,
    type: 'payment',
    amount: payAmt,
    event: eventName,
    date: txDate,
    reference: refCode
  };
  db.ledger.push(newTx);

  // Add audit log
  const newAudit = {
    id: `A${String(db.auditLogs.length + 1).padStart(3, '0')}`,
    type: 'payment_received',
    message: `Processed payment of ₱${payAmt} for ${member.name} (Ref: ${refCode})`,
    timestamp: txDate
  };
  db.auditLogs.unshift(newAudit);

  if (writeDB(db)) {
    res.json(db);
  } else {
    res.status(500).json({ error: 'Database write failed' });
  }
});

// 4. Update Rule Policy
app.post('/api/rules', (req, res) => {
  const { meeting, major_event, special_event } = req.body;
  
  const db = readDB();
  if (meeting !== undefined) db.rules.meeting = parseInt(meeting) || 0;
  if (major_event !== undefined) db.rules.major_event = parseInt(major_event) || 0;
  if (special_event !== undefined) db.rules.special_event = parseInt(special_event) || 0;

  const txDate = getFormattedDate();
  const newAudit = {
    id: `A${String(db.auditLogs.length + 1).padStart(3, '0')}`,
    type: 'rule_updated',
    message: `Updated sanction fine amount rules - Meeting: ₱${db.rules.meeting}, Major Event: ₱${db.rules.major_event}, Special Event: ₱${db.rules.special_event}`,
    timestamp: txDate
  };
  db.auditLogs.unshift(newAudit);

  if (writeDB(db)) {
    res.json(db);
  } else {
    res.status(500).json({ error: 'Database write failed' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Express Sanction Backend running at http://localhost:${PORT}`);
});
