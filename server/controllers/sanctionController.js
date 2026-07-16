const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Ledger = require('../models/Ledger');
const Rule = require('../models/Rule');
const Attendance = require('../models/Attendance');

const DB_PATH = path.join(__dirname, '..', 'data.json');

const STANDING_THRESHOLD = 150;

const getSanctionCollection = async () => {
  const sanctionCollectionName = 'sanction';
  const exists = await mongoose.connection.db.listCollections({ name: sanctionCollectionName }).hasNext();
  if (!exists) {
    throw new Error('sanction-collection-missing');
  }
  return mongoose.connection.db.collection(sanctionCollectionName);
};

const buildSanctionDoc = ({ attendance, member, fineAmount, eventName, txId }) => ({
  attendanceId: attendance.attendanceId || attendance._id,
  memberId: member.id,
  studentId: attendance.studentId || attendance.student_id || attendance.studentNumber || attendance.studentNo || '',
  status: normalizeString(attendance.status || attendance.state) || 'absent',
  eventType: attendance.eventType || attendance.event_type || 'meeting',
  description: attendance.description || attendance.notes || attendance.detail || '',
  amount: fineAmount,
  event: eventName,
  date: attendance.date || getFormattedDate(),
  processedAt: getFormattedDate(),
  reference: '',
  txId,
  createdAt: new Date()
});

const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const getNextTxId = async () => {
  const lastTx = await Ledger.findOne({ id: /^TX\d+$/ }).sort({ id: -1 });
  if (!lastTx) return 'TX001';
  const num = parseInt(lastTx.id.replace('TX', ''), 10) || 0;
  return `TX${String(num + 1).padStart(3, '0')}`;
};

const formatTxId = (number) => `TX${String(number).padStart(3, '0')}`;

const buildEventLabel = (type) => {
  if (type === 'major_event') return 'Major Event';
  if (type === 'special_event') return 'Special Event';
  return 'Meeting';
};

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const getAttendanceField = (record, ...fields) => {
  for (const field of fields) {
    if (record[field] !== undefined && record[field] !== null) {
      return record[field];
    }
  }
  return undefined;
};

const getAttendanceCollectionName = async () => {
  const candidates = ['attendance', 'attendances'];
  for (const name of candidates) {
    const exists = await mongoose.connection.db.listCollections({ name }).hasNext();
    if (exists) return name;
  }
  return candidates[0];
};

const isAbsentAttendance = (record, statusOverride) => {
  const statusValue = normalizeString(getAttendanceField(record, 'status', 'attendanceStatus', 'attendance_status', 'state'));
  const presentValue = getAttendanceField(record, 'present');
  const absentValues = ['absent', 'a', 'no', 'n', 'unexcused'];

  if (statusOverride) {
    return normalizeString(statusOverride) === statusValue;
  }

  if (typeof presentValue === 'boolean') {
    return !presentValue;
  }

  if (presentValue !== undefined && presentValue !== null) {
    return normalizeString(presentValue) === 'false' || normalizeString(presentValue) === '0';
  }

  return absentValues.includes(statusValue);
};

const processAttendanceRecords = async ({ fromDate, toDate, status, eventType } = {}) => {
  const validEventTypes = ['meeting', 'major_event', 'special_event'];
  let rulesDoc = await Rule.findOne();
  if (!rulesDoc) {
    rulesDoc = await Rule.create({ meeting: 50, major_event: 100, special_event: 150 });
  }

  const filter = {
    $or: [
      { processed: false },
      { processed: { $exists: false } }
    ]
  };

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = fromDate;
    if (toDate) filter.date.$lte = toDate;
  }

  const collectionName = await getAttendanceCollectionName();
  const attendanceRecords = await mongoose.connection.db.collection(collectionName).find(filter).toArray();
  const filteredRecords = attendanceRecords.filter(record => isAbsentAttendance(record, status));
  if (!filteredRecords.length) {
    return { processed: 0, skipped: 0, warnings: [] };
  }

  const attendanceCollection = mongoose.connection.db.collection(collectionName);
  const sanctionCollection = await getSanctionCollection();
  const lastTx = await Ledger.findOne({ id: /^TX\d+$/ }).sort({ id: -1 }).lean();
  let nextTxNumber = lastTx ? parseInt(lastTx.id.replace('TX', ''), 10) || 0 : 0;
  const processedCount = { success: 0, skipped: 0 };
  const warnings = [];
  const attendanceUpdates = [];
  const memberSaves = [];
  const ledgerCreates = [];
  const sanctionCreates = [];

  for (const attendance of filteredRecords) {
    const memberRef = getAttendanceField(attendance, 'member', 'memberId', 'member_id', 'memberid');
    const studentIdValue = getAttendanceField(attendance, 'studentId', 'student_id', 'studentId', 'studentNumber', 'studentNo');

    if (!memberRef && !studentIdValue) {
      warnings.push(`Skipping attendance record ${attendance.attendanceId || attendance._id} because no memberId or studentId was provided.`);
      processedCount.skipped += 1;
      continue;
    }

    let member = null;
    if (memberRef) {
      if (mongoose.isValidObjectId(memberRef)) {
        member = await Member.findById(memberRef);
      }
      if (!member) {
        member = await Member.findOne({ id: String(memberRef).trim() });
      }
    }
    if (!member && studentIdValue) {
      member = await Member.findOne({ studentId: String(studentIdValue).trim() });
    }
    if (!member && attendance.memberName) {
      member = await Member.findOne({ name: String(attendance.memberName).trim() });
    }
    if (!member) {
      warnings.push(`Member not found for attendance record ${attendance.attendanceId || attendance._id} (${memberRef || studentIdValue || attendance.memberName}).`);
      processedCount.skipped += 1;
      continue;
    }

    const recordEventType = getAttendanceField(attendance, 'eventType', 'event_type', 'type');
    const useType = eventType || (validEventTypes.includes(recordEventType) ? recordEventType : 'meeting');
    const fineAmount = rulesDoc[useType] || rulesDoc.meeting;
    const eventLabel = buildEventLabel(useType);
    const descriptionValue = getAttendanceField(attendance, 'description', 'notes', 'detail');
    const eventName = `Unexcused Absence - ${eventLabel}${descriptionValue ? ` (${descriptionValue})` : ''}`;

    member.balance += fineAmount;
    if (member.balance >= STANDING_THRESHOLD) {
      member.standing = 'Not in Good Standing';
    }
    memberSaves.push(member.save());

    nextTxNumber += 1;
    const newTxId = formatTxId(nextTxNumber);
    ledgerCreates.push(Ledger.create({
      id: newTxId,
      memberId: member.id,
      type: 'fine',
      amount: fineAmount,
      event: eventName,
      date: getFormattedDate(),
      reference: ''
    }));

    sanctionCreates.push(sanctionCollection.insertOne(buildSanctionDoc({
      attendance,
      member,
      fineAmount,
      eventName,
      txId: newTxId
    })));

    attendanceUpdates.push(
      attendanceCollection.updateOne(
        { _id: attendance._id },
        {
          $set: {
            processed: true,
            processedAt: getFormattedDate(),
            memberId: member.id
          }
        }
      )
    );
    processedCount.success += 1;
  }

  await Promise.all([...memberSaves, ...ledgerCreates, ...sanctionCreates, ...attendanceUpdates]);
  return { processed: processedCount.success, skipped: processedCount.skipped, warnings };
};

const getState = async () => {
  try {
    // If mongoose is not connected, skip DB calls to avoid buffering/timeouts
    if (mongoose.connection.readyState !== 1) {
      throw new Error('mongoose-not-connected');
    }

    await processAttendanceRecords();

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

    const sanctionCollection = await getSanctionCollection();
    await sanctionCollection.insertOne(buildSanctionDoc({
      attendance: {
        attendanceId: null,
        studentId: member.studentId || member.id,
        status: 'absent',
        eventType,
        description: trimmedEventName,
        date: txDate
      },
      member,
      fineAmount,
      eventName,
      txId: newTxId
    }));

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

const handleProcessAttendance = async (req, res) => {
  const { fromDate, toDate, eventType } = req.body || {};
  const validEventTypes = ['meeting', 'major_event', 'special_event'];

  try {
    let rulesDoc = await Rule.findOne();
    if (!rulesDoc) {
      rulesDoc = await Rule.create({ meeting: 50, major_event: 100, special_event: 150 });
    }

    const filter = {
      $or: [
        { processed: false },
        { processed: { $exists: false } }
      ]
    };
    if (eventType) filter.eventType = eventType;
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = fromDate;
      if (toDate) filter.date.$lte = toDate;
    }

    const collectionName = await getAttendanceCollectionName();
    const attendanceCollection = mongoose.connection.db.collection(collectionName);
    const attendanceRecords = await attendanceCollection.find(filter).toArray();
    const filteredRecords = attendanceRecords.filter(record => isAbsentAttendance(record));
    if (!filteredRecords.length) {
      return res.json({ message: 'No unprocessed attendance absences found.', processed: 0, skipped: 0, warnings: [] });
    }

    const sanctionCollection = await getSanctionCollection();
    const lastTx = await Ledger.findOne({ id: /^TX\d+$/ }).sort({ id: -1 }).lean();
    let nextTxNumber = lastTx ? parseInt(lastTx.id.replace('TX', ''), 10) || 0 : 0;
    const processedCount = { success: 0, skipped: 0 };
    const warnings = [];
    const attendanceUpdates = [];
    const memberSaves = [];
    const ledgerCreates = [];
    const sanctionCreates = [];

    for (const attendance of filteredRecords) {
      if (!attendance.memberId && !attendance.studentId) {
        warnings.push(`Skipping attendance record ${attendance.attendanceId || attendance._id} because no memberId or studentId was provided.`);
        processedCount.skipped += 1;
        continue;
      }

      let member = null;
      if (attendance.memberId) {
        member = await Member.findOne({ id: attendance.memberId.trim() });
      }
      if (!member && attendance.studentId) {
        member = await Member.findOne({ studentId: attendance.studentId.trim() });
      }
      if (!member) {
        warnings.push(`Member not found for attendance record ${attendance.attendanceId || attendance._id} (${attendance.memberId || attendance.studentId}).`);
        processedCount.skipped += 1;
        continue;
      }

      const useType = validEventTypes.includes(attendance.eventType) ? attendance.eventType : 'meeting';
      const fineAmount = rulesDoc[useType] || rulesDoc.meeting;
      const eventLabel = buildEventLabel(useType);
      const eventName = `Unexcused Absence - ${eventLabel}${attendance.description ? ` (${attendance.description})` : ''}`;

      member.balance += fineAmount;
      if (member.balance >= STANDING_THRESHOLD) {
        member.standing = 'Not in Good Standing';
      }
      memberSaves.push(member.save());

      nextTxNumber += 1;
      const newTxId = formatTxId(nextTxNumber);
      ledgerCreates.push(Ledger.create({
        id: newTxId,
        memberId: member.id,
        type: 'fine',
        amount: fineAmount,
        event: eventName,
        date: getFormattedDate(),
        reference: ''
      }));

      sanctionCreates.push(sanctionCollection.insertOne(buildSanctionDoc({
        attendance,
        member,
        fineAmount,
        eventName,
        txId: newTxId
      })));

      attendanceUpdates.push(
        attendanceCollection.updateOne(
          { _id: attendance._id },
          {
            $set: {
              processed: true,
              processedAt: getFormattedDate(),
              memberId: member.id
            }
          }
        )
      );
      processedCount.success += 1;
    }

    await Promise.all([...memberSaves, ...ledgerCreates, ...sanctionCreates, ...attendanceUpdates]);
    const state = await getState();

    res.json({
      message: 'Processed attendance absences into sanctions.',
      processed: processedCount.success,
      skipped: processedCount.skipped,
      warnings,
      state
    });
  } catch (error) {
    console.error('Error processing attendance records:', error);
    res.status(500).json({ error: 'Failed to process attendance records' });
  }
};

module.exports = {
  handleGetState,
  handleLogInfraction,
  handleProcessPayment,
  handleUpdateRules,
  handleProcessAttendance
};
