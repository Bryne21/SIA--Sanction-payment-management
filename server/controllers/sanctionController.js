const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');

const DB_PATH = path.join(__dirname, '..', 'data.json');

const getSanctionCollection = async () => {
  const sanctionCollectionName = 'sanction';
  const db = mongoose.connection.db;
  if (!db) return null;
  await db.createCollection(sanctionCollectionName).catch(() => {});
  return db.collection(sanctionCollectionName);
};

const buildSanctionDoc = ({ attendance, member, fineAmount, eventName, eventTitle, resolvedEventType, paymentStatus, isPaid }) => {
  const memberIdFromAttendance = attendance.memberId || attendance.member_id || attendance.studentId || attendance.student_id || attendance.studentNumber || attendance.studentNo || '';
  const memberNameFromAttendance = attendance.memberName || attendance.name || memberIdFromAttendance || 'Unknown Member';
  const studentIdFromAttendance = attendance.studentId || attendance.student_id || attendance.studentNumber || attendance.studentNo || memberIdFromAttendance || '';
  const resolvedMember = member || { id: memberIdFromAttendance, name: memberNameFromAttendance, studentId: studentIdFromAttendance };

  return {
    attendanceId: attendance.attendanceId || attendance._id,
    memberId: resolvedMember.id || memberIdFromAttendance,
    memberName: resolvedMember.name || memberNameFromAttendance,
    name: resolvedMember.name || memberNameFromAttendance,
    studentId: resolvedMember.studentId || studentIdFromAttendance,
    status: normalizeString(attendance.status || attendance.state) || 'absent',
    eventType: resolvedEventType || attendance.eventType || attendance.event_type || 'meeting',
    description: eventTitle || attendance.description || attendance.notes || attendance.detail || '',
    amount: fineAmount || 100,
    event: eventName,
    date: attendance.date || getFormattedDate(),
    processedAt: getFormattedDate(),
    createdAt: new Date(),
    paymentStatus: paymentStatus !== undefined ? paymentStatus : 'unpaid',
    isPaid: isPaid !== undefined ? isPaid : false
  };
};

const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const removeLegacyMemberBalanceField = async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    const result = await Member.updateMany({ balance: { $exists: true } }, { $unset: { balance: '' } });
    if (result.modifiedCount > 0) {
      console.log(`Removed legacy balance field from ${result.modifiedCount} member document(s).`);
    }
  } catch (error) {
    console.warn('Unable to remove legacy member balance field:', error.message);
  }
};

const buildEventLabel = (type) => {
  if (!type || typeof type !== 'string') return 'Meeting';
  const normalized = String(type).trim().toLowerCase().replace(/[_-]+/g, ' ');
  const mapping = {
    'major event': 'Major Event',
    'special event': 'Special Event',
    meeting: 'Meeting',
    seminar: 'Seminar',
    webinar: 'Webinar',
    workshop: 'Workshop',
    sports: 'Sports',
    social: 'Social',
    other: 'Other'
  };

  if (mapping[normalized]) return mapping[normalized];

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getEventsCollectionName = async () => {
  const db = mongoose.connection.db;
  const candidates = ['event-data', 'events-data'];
  for (const name of candidates) {
    if (await db.listCollections({ name }).hasNext()) {
      return name;
    }
  }
  return 'event-data';
};

const normalizeEventTypeLabel = (value) => {
  if (value === undefined || value === null || value === '') return '';

  const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, ' ');
  const mapping = {
    'major event': 'Major Event',
    'special event': 'Special Event',
    meeting: 'Meeting',
    seminar: 'Seminar',
    webinar: 'Webinar',
    workshop: 'Workshop',
    sports: 'Sports',
    social: 'Social',
    other: 'Other'
  };

  if (mapping[normalized]) return mapping[normalized];

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const normalizeEventTypeCode = (value) => {
  if (value === undefined || value === null || value === '') return '';

  const normalized = String(value).trim().toLowerCase().replace(/[_\s-]+/g, '_');
  const mapping = {
    'major_event': 'major_event',
    'special_event': 'special_event',
    'meeting': 'meeting',
    'seminar': 'seminar',
    'webinar': 'webinar',
    'workshop': 'workshop',
    'sports': 'sports',
    'social': 'social',
    'other': 'other'
  };

  return mapping[normalized] || '';
};

const getEventOptions = async () => {
  const options = { titles: [], types: [], typeByTitle: {} };

  if (mongoose.connection.readyState !== 1) {
    return options;
  }

  try {
    const collectionName = await getEventsCollectionName();
    const eventDocs = await mongoose.connection.db.collection(collectionName).find({}).project({ title: 1, type: 1 }).toArray();
    const seenTitles = new Set();
    const seenTypes = new Set();

    eventDocs.forEach((doc) => {
      const title = String(doc.title || '').trim();
      const titleKey = String(doc.title || '').trim().toLowerCase();
      const type = String(doc.type || '').trim();
      const typeCode = normalizeEventTypeCode(type);
      if (title) {
        if (!seenTitles.has(title)) {
          seenTitles.add(title);
          options.titles.push(title);
        }
        if (typeCode) {
          options.typeByTitle[titleKey] = typeCode;
        }
      }

      const typeLabel = normalizeEventTypeLabel(type);
      if (typeLabel && !seenTypes.has(typeLabel)) {
        seenTypes.add(typeLabel);
        options.types.push(typeLabel);
      }
    });
  } catch (error) {
    console.warn('Unable to read event options from events-data collection:', error.message);
  }

  return options;
};

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const normalizePaymentStatus = (value) => {
  const normalized = normalizeString(value);
  if (normalized === 'paid') return 'paid';
  return 'unpaid';
};

const buildFallbackSanctionsFromLedger = (parsedData) => {
  const members = Array.isArray(parsedData?.members) ? parsedData.members : [];
  const ledgerEntries = Array.isArray(parsedData?.ledger) ? parsedData.ledger : [];
  const memberMap = new Map(members.map((member) => [member.id, member]));

  return ledgerEntries
    .filter((entry) => entry?.type === 'fine')
    .map((entry) => {
      const member = memberMap.get(entry.memberId) || null;
      const eventText = entry.event || 'Unexcused Absence';
      const normalizedEvent = eventText.toLowerCase();
      let eventType = 'meeting';
      if (normalizedEvent.includes('special')) eventType = 'special_event';
      else if (normalizedEvent.includes('major') || normalizedEvent.includes('festival') || normalizedEvent.includes('camp')) eventType = 'major_event';

      return {
        attendanceId: entry.id || entry.reference || entry.memberId,
        memberId: entry.memberId,
        memberName: member?.name || entry.memberId || 'Unknown Member',
        name: member?.name || entry.memberId || 'Unknown Member',
        studentId: entry.memberId,
        status: 'absent',
        eventType,
        description: eventText.replace(/^Unexcused Absence - /i, ''),
        amount: entry.amount || 100,
        event: eventText,
        date: entry.date || getFormattedDate(),
        processedAt: entry.date || getFormattedDate(),
        createdAt: new Date(),
        paymentStatus: 'unpaid',
        isPaid: false
      };
    });
};

const ensureSanctionSeedData = async () => {
  if (mongoose.connection.readyState !== 1) {
    return { inserted: 0, updated: 0, skipped: true };
  }

  try {
    const sanctionCollection = await getSanctionCollection();
    if (!sanctionCollection) {
      return { inserted: 0, updated: 0, skipped: true };
    }

    const syncResult = await syncAttendanceAbsencesToSanctions({ markProcessed: true });
    const updateResult = await sanctionCollection.updateMany(
      {
        $or: [
          { paymentStatus: { $exists: false } },
          { isPaid: { $exists: false } }
        ]
      },
      {
        $set: {
          paymentStatus: 'unpaid',
          isPaid: false,
          updatedAt: new Date()
        }
      }
    );

    return {
      inserted: syncResult.processed,
      updated: syncResult.processed > 0 ? syncResult.processed : updateResult.modifiedCount,
      deleted: syncResult.deleted,
      skipped: syncResult.skipped
    };
  } catch (error) {
    console.warn('Failed to ensure sanction seed data:', error.message);
    return { inserted: 0, updated: 0, error: error.message };
  }
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

const findMemberForAttendance = async (attendance, warnings = []) => {
  const memberRef = getAttendanceField(attendance, 'member', 'memberId', 'member_id', 'memberid');
  const studentIdValue = getAttendanceField(attendance, 'studentId', 'student_id', 'studentId', 'studentNumber', 'studentNo');

  if (!memberRef && !studentIdValue) {
    warnings.push(`Skipping attendance record ${attendance.attendanceId || attendance._id} because no memberId or studentId was provided.`);
    return { member: null, warning: true };
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
    const fallbackId = memberRef || studentIdValue || attendance.memberName || '';
    const fallbackName = attendance.memberName || attendance.name || fallbackId || 'Unknown Member';
    const fallbackStudentId = studentIdValue || fallbackId;
    return {
      member: {
        id: fallbackId,
        name: fallbackName,
        studentId: fallbackStudentId
      },
      warning: false
    };
  }

  return { member, warning: false };
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

const syncAttendanceAbsencesToSanctions = async ({ fromDate, toDate, status, eventType, markProcessed = true } = {}) => {
  const validEventTypes = ['meeting', 'seminar', 'webinar', 'workshop', 'sports', 'social', 'other', 'major_event', 'special_event'];

  const filter = {};
  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = fromDate;
    if (toDate) filter.date.$lte = toDate;
  }

  const collectionName = await getAttendanceCollectionName();
  const attendanceCollection = mongoose.connection.db.collection(collectionName);
  const sanctionCollection = await getSanctionCollection();
  const attendanceRecords = await attendanceCollection.find(filter).toArray();
  const filteredRecords = attendanceRecords.filter(record => isAbsentAttendance(record, status));
  const processedCount = { success: 0, skipped: 0, deleted: 0 };
  const warnings = [];
  const writes = [];
  const memberSaves = [];

  const absentAttendanceIds = new Set(filteredRecords.map((record) => String(record.attendanceId || record._id || '')).filter(Boolean));
  const attendanceById = new Map(attendanceRecords.map((record) => [String(record.attendanceId || record._id || ''), record]));
  const existingSanctions = await sanctionCollection.find({}).toArray();
  const existingSanctionByKey = new Map(existingSanctions.map((sanction) => [String(sanction.attendanceId || ''), sanction]));

  for (const attendance of filteredRecords) {
    const { member, warning } = await findMemberForAttendance(attendance, warnings);
    if (warning || !member) {
      processedCount.skipped += 1;
      continue;
    }

    const attendanceKey = String(attendance.attendanceId || attendance._id || '');
    const existingSanction = existingSanctionByKey.get(attendanceKey);

    let eventDoc = null;
    const eventRef = getAttendanceField(attendance, 'eventId', 'event_id', 'event_ref', 'eventRef', 'event');
    const eventTitleCandidate = getAttendanceField(attendance, 'eventTitle', 'title');
    const eventsCollectionName = await getEventsCollectionName();
    const eventsCollection = mongoose.connection.db.collection(eventsCollectionName);

    if (eventRef) {
      let eventQuery = null;
      if (typeof eventRef === 'string' && mongoose.isValidObjectId(eventRef)) {
        eventQuery = { _id: new mongoose.Types.ObjectId(eventRef) };
      } else if (typeof eventRef === 'string') {
        eventQuery = { title: eventRef };
      } else {
        eventQuery = { _id: eventRef };
      }

      try {
        if (eventQuery) {
          eventDoc = await eventsCollection.findOne(eventQuery);
        }
      } catch (err) {
        console.warn(`Failed to fetch event document ${eventRef}:`, err.message);
      }
    }

    if (!eventDoc && typeof eventTitleCandidate === 'string' && eventTitleCandidate.trim()) {
      try {
        eventDoc = await eventsCollection.findOne({ title: eventTitleCandidate });
      } catch (err) {
        console.warn(`Failed to fetch event document by title ${eventTitleCandidate}:`, err.message);
      }
    }

    const eventTitle = eventDoc ? eventDoc.title : String(eventTitleCandidate || '').trim();
    const recordEventType = eventDoc ? eventDoc.type : getAttendanceField(attendance, 'eventType', 'event_type', 'type');
    const normalizedRecordEventType = normalizeEventTypeCode(recordEventType);
    const useType = eventType || (validEventTypes.includes(normalizedRecordEventType) ? normalizedRecordEventType : 'meeting');
    const fineAmount = 100;
    const eventLabel = buildEventLabel(useType);
    const descriptionValue = eventTitle || getAttendanceField(attendance, 'description', 'notes', 'detail') || '';
    const eventName = `Unexcused Absence - ${eventLabel}${descriptionValue ? ` (${descriptionValue})` : ''}`;

    if (existingSanction) {
      writes.push(sanctionCollection.updateOne(
        { _id: existingSanction._id },
        {
          $set: {
            ...buildSanctionDoc({
              attendance,
              member,
              fineAmount,
              eventName,
              eventTitle,
              resolvedEventType: useType,
              paymentStatus: existingSanction.paymentStatus,
              isPaid: existingSanction.isPaid
            }),
            updatedAt: new Date()
          }
        }
      ));
    } else {
      writes.push(sanctionCollection.insertOne(buildSanctionDoc({
        attendance,
        member,
        fineAmount,
        eventName,
        eventTitle,
        resolvedEventType: useType
      })));
    }

    if (markProcessed) {
      writes.push(attendanceCollection.updateOne(
        { _id: attendance._id },
        {
          $set: {
            processed: true,
            processedAt: getFormattedDate(),
            memberId: member.id
          }
        }
      ));
    }
    processedCount.success += 1;
  }

  for (const sanction of existingSanctions) {
    const sanctionKey = String(sanction.attendanceId || '');
    if (sanctionKey && absentAttendanceIds.has(sanctionKey)) {
      continue;
    }

    const attendance = attendanceById.get(sanctionKey);
    if (attendance && isAbsentAttendance(attendance, status)) {
      continue;
    }

    if (sanction.memberId) {
      const member = await Member.findOne({ id: sanction.memberId });
      if (member) {
        memberSaves.push(member.save());
      }
    }

    writes.push(sanctionCollection.deleteOne({ _id: sanction._id }));
    processedCount.deleted += 1;
  }

  await Promise.all([...memberSaves, ...writes]);
  return { processed: processedCount.success, skipped: processedCount.skipped, deleted: processedCount.deleted, warnings };
};

const processAttendanceRecords = async ({ fromDate, toDate, status, eventType } = {}) => {
  return syncAttendanceAbsencesToSanctions({ fromDate, toDate, status, eventType });
};

const getState = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('mongoose-not-connected');
    }

    await removeLegacyMemberBalanceField();
    await syncAttendanceAbsencesToSanctions();

    const sanctionCollection = await getSanctionCollection();
    const collectionName = await getAttendanceCollectionName();
    const attendanceCollection = mongoose.connection.db.collection(collectionName);

    let sanctions = await sanctionCollection.find().toArray();

    if (!sanctions.length) {
      try {
        if (fs.existsSync(DB_PATH)) {
          const raw = fs.readFileSync(DB_PATH, 'utf8');
          const parsed = JSON.parse(raw);
          const fallbackSanctions = buildFallbackSanctionsFromLedger(parsed);
          if (fallbackSanctions.length > 0) {
            await sanctionCollection.insertMany(fallbackSanctions);
            sanctions = await sanctionCollection.find().toArray();
            console.log(`Seeded ${sanctions.length} sanctions into MongoDB.`);
          }
        }
      } catch (seedErr) {
        console.warn('Failed to seed fallback sanctions into MongoDB:', seedErr.message);
      }
    }

    if (sanctions.length > 0) {
      const missingPaymentStatus = sanctions.filter((sanction) => sanction.paymentStatus === undefined && sanction.isPaid === undefined);
      if (missingPaymentStatus.length > 0) {
        const ids = missingPaymentStatus.map((sanction) => sanction._id);
        await sanctionCollection.updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              paymentStatus: 'unpaid',
              isPaid: false,
              updatedAt: new Date()
            }
          }
        );
        sanctions = await sanctionCollection.find().toArray();
      }
    }

    // Reconcile/sync manual deletions from attendances
    const attendanceIds = sanctions.map(s => s.attendanceId).filter(Boolean);

    const queryIds = [];
    for (const id of attendanceIds) {
      queryIds.push(id.toString());
      if (mongoose.isValidObjectId(id)) {
        queryIds.push(new mongoose.Types.ObjectId(id));
      }
    }

    const existingAttendances = await attendanceCollection.find({
      _id: { $in: queryIds }
    }).project({ _id: 1 }).toArray();

    const existingIdsSet = new Set();
    existingAttendances.forEach(a => {
      if (a._id) {
        existingIdsSet.add(a._id.toString());
      }
    });

    const sanctionsToDelete = sanctions.filter(s => {
      if (!s.attendanceId) return false;
      return !existingIdsSet.has(s.attendanceId.toString());
    });

    if (sanctionsToDelete.length > 0) {
      const idsToDelete = sanctionsToDelete.map(s => s._id);
      await sanctionCollection.deleteMany({ _id: { $in: idsToDelete } });

      for (const sanction of sanctionsToDelete) {
        if (sanction.memberId) {
          const member = await Member.findOne({ id: sanction.memberId });
          if (member) {
            await member.save();
          }
        }
      }
      console.log(`Reconciled database: Deleted ${sanctionsToDelete.length} stale sanctions.`);
      // Refresh sanctions list
      sanctions = await sanctionCollection.find().toArray();
    }

    const members = await Member.find().lean();
    const cleanMembers = (Array.isArray(members) ? members : []).map(({ _id, __v, ...m }) => {
      const id = m.id || m.studentId || _id.toString();
      const name = m.name || [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
      return {
        ...m,
        id,
        name,
        course: m.course || '',
        pageNumber: m.pageNumber || '',
        totalPaid: m.totalPaid !== undefined ? m.totalPaid : 0,
        standing: m.standing || 'Good Standing'
      };
    });
    const cleanSanctions = sanctions.map(({ _id, ...s }) => ({
      ...s,
      id: _id.toString(),
      paymentStatus: normalizePaymentStatus(s.paymentStatus || (s.isPaid ? 'paid' : 'unpaid')),
      isPaid: normalizePaymentStatus(s.paymentStatus || (s.isPaid ? 'paid' : 'unpaid')) === 'paid'
    }));
    const eventOptions = await getEventOptions();
    return {
      members: cleanMembers,
      sanctions: cleanSanctions,
      eventOptions
    };
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
      const eventOptions = await getEventOptions();
      return {
        members: parsed.members || [],
        sanctions: parsed.sanctions || [],
        eventOptions
      };
    }
  } catch (fileErr) {
    console.error('getState: failed to read fallback data.json', fileErr);
  }

  const eventOptions = await getEventOptions();
  return {
    members: [],
    sanctions: [],
    eventOptions
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

const handleUpdateSanctionPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body || {};
    const normalizedStatus = normalizePaymentStatus(paymentStatus);

    if (!id) {
      return res.status(400).json({ error: 'Sanction id is required.' });
    }

    const sanctionCollection = await getSanctionCollection();
    if (!sanctionCollection) {
      return res.status(500).json({ error: 'Database connection is not available.' });
    }

    const query = {
      $or: [
        { _id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id },
        { id },
        { _id: id }
      ]
    };

    const existingSanction = await sanctionCollection.findOne(query);
    if (!existingSanction) {
      return res.status(404).json({ error: 'Sanction not found.' });
    }

    const oldStatus = existingSanction.paymentStatus === 'paid' ? 'paid' : 'unpaid';
    const newStatus = normalizedStatus;

    if (oldStatus !== newStatus) {
      if (existingSanction.memberId) {
        const member = await Member.findOne({ id: existingSanction.memberId });
        if (member) {
          const amount = existingSanction.amount || 100;
          if (newStatus === 'paid') {
            member.totalPaid = (member.totalPaid || 0) + amount;
          } else {
            member.totalPaid = Math.max(0, (member.totalPaid || 0) - amount);
          }
          await member.save();
        }
      }
    }

    const result = await sanctionCollection.updateOne(query, {
      $set: {
        paymentStatus: newStatus,
        isPaid: newStatus === 'paid',
        updatedAt: new Date()
      }
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Sanction not found.' });
    }

    const state = await getState();
    res.json({
      message: `Sanction marked as ${newStatus}.`,
      paymentStatus: newStatus,
      state
    });
  } catch (error) {
    console.error('Error updating sanction payment status:', error);
    res.status(500).json({ error: 'Failed to update sanction payment status' });
  }
};

const handleProcessAttendance = async (req, res) => {
  const { fromDate, toDate, eventType } = req.body || {};
  const validEventTypes = ['meeting', 'seminar', 'webinar', 'workshop', 'sports', 'social', 'other', 'major_event', 'special_event'];

  try {
    const filter = {};
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
      return res.json({ message: 'No absent attendance records found.', processed: 0, skipped: 0, warnings: [] });
    }

    const result = await syncAttendanceAbsencesToSanctions({ fromDate, toDate, status: undefined, eventType, markProcessed: true });
    const state = await getState();

    res.json({
      message: 'Processed attendance absences into sanctions.',
      processed: result.processed,
      skipped: result.skipped,
      deleted: result.deleted,
      warnings: result.warnings,
      state
    });
  } catch (error) {
    console.error('Error processing attendance records:', error);
    res.status(500).json({ error: 'Failed to process attendance records' });
  }
};

module.exports = {
  handleGetState,
  handleUpdateSanctionPaymentStatus,
  handleProcessAttendance,
  ensureSanctionSeedData
};
