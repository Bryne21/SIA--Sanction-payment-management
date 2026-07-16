const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');

const DB_PATH = path.join(__dirname, '..', 'data.json');

const getSanctionCollection = async () => {
  const sanctionCollectionName = 'sanction';
  return mongoose.connection.db.collection(sanctionCollectionName);
};

const buildSanctionDoc = ({ attendance, member, fineAmount, eventName, eventTitle, resolvedEventType }) => ({
  attendanceId: attendance.attendanceId || attendance._id,
  memberId: member.id,
  memberName: member.name,
  name: member.name,
  studentId: attendance.studentId || attendance.student_id || attendance.studentNumber || attendance.studentNo || '',
  status: normalizeString(attendance.status || attendance.state) || 'absent',
  eventType: resolvedEventType || attendance.eventType || attendance.event_type || 'meeting',
  description: eventTitle || attendance.description || attendance.notes || attendance.detail || '',
  amount: fineAmount || 50,
  event: eventName,
  date: attendance.date || getFormattedDate(),
  processedAt: getFormattedDate(),
  createdAt: new Date()
});

const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

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
  const processedCount = { success: 0, skipped: 0 };
  const warnings = [];
  const attendanceUpdates = [];
  const memberSaves = [];
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

    let eventDoc = null;
    const eventRef = getAttendanceField(attendance, 'event', 'eventId', 'event_id');
    if (eventRef) {
      let eventIdQuery = eventRef;
      if (typeof eventRef === 'string') {
        eventIdQuery = mongoose.isValidObjectId(eventRef) ? new mongoose.Types.ObjectId(eventRef) : eventRef;
      }
      try {
        eventDoc = await mongoose.connection.db.collection('events-data').findOne({ _id: eventIdQuery });
      } catch (err) {
        console.warn(`Failed to fetch event document ${eventRef}:`, err.message);
      }
    }

    const eventTitle = eventDoc ? eventDoc.title : '';
    const recordEventType = eventDoc ? eventDoc.type : getAttendanceField(attendance, 'eventType', 'event_type', 'type');
    const useType = eventType || (validEventTypes.includes(recordEventType) ? recordEventType : 'meeting');
    const fineAmount = 50;
    const eventLabel = buildEventLabel(useType);
    const descriptionValue = eventTitle || getAttendanceField(attendance, 'description', 'notes', 'detail') || '';
    const eventName = `Unexcused Absence - ${eventLabel}${descriptionValue ? ` (${descriptionValue})` : ''}`;

    member.balance += fineAmount;
    memberSaves.push(member.save());

    sanctionCreates.push(sanctionCollection.insertOne(buildSanctionDoc({
      attendance,
      member,
      fineAmount,
      eventName,
      eventTitle,
      resolvedEventType: useType
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

  await Promise.all([...memberSaves, ...sanctionCreates, ...attendanceUpdates]);
  return { processed: processedCount.success, skipped: processedCount.skipped, warnings };
};

const getState = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('mongoose-not-connected');
    }

    await processAttendanceRecords();

    const members = await Member.find().lean();
    const sanctionCollection = await getSanctionCollection();
    const sanctions = await sanctionCollection.find().toArray();

    if (Array.isArray(members) && members.length > 0) {
      const cleanMembers = members.map(({ _id, __v, ...m }) => {
        const id = m.id || m.studentId || _id.toString();
        const name = m.name || [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
        return {
          ...m,
          id,
          name,
          balance: m.balance !== undefined ? m.balance : 0,
          totalPaid: m.totalPaid !== undefined ? m.totalPaid : 0,
          standing: m.standing || 'Good Standing'
        };
      });
      const cleanSanctions = sanctions.map(({ _id, ...s }) => ({
        ...s,
        id: _id.toString()
      }));
      return {
        members: cleanMembers,
        sanctions: cleanSanctions
      };
    }
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
        sanctions: parsed.sanctions || []
      };
    }
  } catch (fileErr) {
    console.error('getState: failed to read fallback data.json', fileErr);
  }

  return {
    members: [],
    sanctions: []
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

    const fineAmount = 50;
    const eventLabel = eventType === 'meeting' ? 'Meeting' : eventType === 'major_event' ? 'Major Event' : 'Special Event';
    const eventName = `Unexcused Absence - ${eventLabel} (${trimmedEventName})`;
    const txDate = getFormattedDate();

    member.balance += fineAmount;
    await member.save();

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
      eventTitle: trimmedEventName,
      resolvedEventType: eventType
    }));

    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error('Error processing infraction:', error);
    res.status(500).json({ error: 'Database write failed' });
  }
};

const handleProcessAttendance = async (req, res) => {
  const { fromDate, toDate, eventType } = req.body || {};
  const validEventTypes = ['meeting', 'major_event', 'special_event'];

  try {
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
    const processedCount = { success: 0, skipped: 0 };
    const warnings = [];
    const attendanceUpdates = [];
    const memberSaves = [];
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

      let eventDoc = null;
      const eventRef = getAttendanceField(attendance, 'event', 'eventId', 'event_id');
      if (eventRef) {
        let eventIdQuery = eventRef;
        if (typeof eventRef === 'string') {
          eventIdQuery = mongoose.isValidObjectId(eventRef) ? new mongoose.Types.ObjectId(eventRef) : eventRef;
        }
        try {
          eventDoc = await mongoose.connection.db.collection('events-data').findOne({ _id: eventIdQuery });
        } catch (err) {
          console.warn(`Failed to fetch event document ${eventRef}:`, err.message);
        }
      }

      const eventTitle = eventDoc ? eventDoc.title : '';
      const recordEventType = eventDoc ? eventDoc.type : getAttendanceField(attendance, 'eventType', 'event_type', 'type');
      const useType = validEventTypes.includes(recordEventType) ? recordEventType : 'meeting';
      const fineAmount = 50;
      const eventLabel = buildEventLabel(useType);
      const descriptionValue = eventTitle || getAttendanceField(attendance, 'description', 'notes', 'detail') || '';
      const eventName = `Unexcused Absence - ${eventLabel}${descriptionValue ? ` (${descriptionValue})` : ''}`;

      member.balance += fineAmount;
      memberSaves.push(member.save());

      sanctionCreates.push(sanctionCollection.insertOne(buildSanctionDoc({
        attendance,
        member,
        fineAmount,
        eventName,
        eventTitle,
        resolvedEventType: useType
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

    await Promise.all([...memberSaves, ...sanctionCreates, ...attendanceUpdates]);
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
  handleProcessAttendance
};
