import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Button
} from '@mui/material';

function MembersList({ members = [], sanctions = [], eventOptions = {} }) {
  const [eventFilter, setEventFilter] = useState('all');
  const [specificEventFilter, setSpecificEventFilter] = useState('all');
  const [search, setSearch] = useState('');

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

  const eventTypeOptions = useMemo(() => {
    // Order should match screenshot: Seminar, Webinar, Workshop, Meeting, Sports, Social, Other
    const preferred = [
      'Seminar',
      'Webinar',
      'Workshop',
      'Meeting',
      'Sports',
      'Social',
      'Other'
    ];
    const fromCollection = Array.isArray(eventOptions?.types) ? eventOptions.types.map(t => normalizeEventTypeLabel(t)).filter(Boolean) : [];
    const fromSet = new Set(fromCollection);
    const preferredSet = new Set(preferred);
    const extras = Array.from(fromSet).filter(t => !preferredSet.has(t)).sort();
    return [...preferred, ...extras];
  }, [eventOptions]);

  const normalizeForCompare = (v) => String(v || '').toLowerCase().trim();

  const titleToTypeMap = useMemo(() => {
    return eventOptions?.typeByTitle && typeof eventOptions.typeByTitle === 'object'
      ? eventOptions.typeByTitle
      : {};
  }, [eventOptions]);

  const getEventTypeFromTitle = useCallback((title) => {
    const titleKey = String(title || '').trim().toLowerCase();
    return normalizeEventTypeLabel(titleToTypeMap[titleKey] || '');
  }, [titleToTypeMap]);

  const uniqueEvents = useMemo(() => {
    const fromCollection = Array.isArray(eventOptions?.titles) ? eventOptions.titles.filter(Boolean) : [];
    const filtered = fromCollection.filter((title) => {
      if (eventFilter === 'all') return true;
      return normalizeForCompare(getEventTypeFromTitle(title)) === normalizeForCompare(eventFilter);
    });
    return [...new Set(filtered)].sort();
  }, [eventFilter, eventOptions, getEventTypeFromTitle]);

  // Filter sanctions by selected filters, then derive member ids

  const getEventTypeFromSanction = useCallback((record) => {
    const explicitType = normalizeEventTypeLabel(record?.eventType || record?.type || record?.event?.type || record?.event_type || '');
    if (explicitType) return explicitType;

    const raw = record?.description || record?.eventTitle || record?.event || '';
    const title = String(raw).trim();
    let eventTitle = title;
    if (title.startsWith('Unexcused Absence -')) {
      const match = title.match(/\((.+)\)$/);
      if (match) eventTitle = match[1];
    }

    const titleKey = String(eventTitle || '').trim().toLowerCase();
    const titleType = normalizeEventTypeLabel(titleToTypeMap[titleKey]);
    if (titleType) return titleType;

    const text = `${record.description || ''} ${record.event || ''}`.toLowerCase();
    if (text.includes('seminar') || text.includes('jpice') || text.includes('micro seminar')) return 'Seminar';
    if (text.includes('webinar')) return 'Webinar';
    if (text.includes('workshop')) return 'Workshop';
    if (text.includes('meeting')) return 'Meeting';
    if (text.includes('sports') || text.includes('game') || text.includes('athletic')) return 'Sports';
    if (text.includes('social') || text.includes('gathering') || text.includes('party') || text.includes('ava')) return 'Social';
    return 'Other';
  }, [titleToTypeMap]);

  const filteredSanctionMemberIds = useMemo(() => {
    let result = sanctions;
    if (eventFilter !== 'all') {
      result = result.filter(s => normalizeForCompare(getEventTypeFromSanction(s)) === normalizeForCompare(eventFilter));
    }
    if (specificEventFilter !== 'all') {
      result = result.filter(s => (s.event || s.description || '').toString() === specificEventFilter || (s.event || '') === specificEventFilter);
    }
    const ids = new Set(result.map(s => s.memberId || s.studentId || s.id).filter(Boolean));
    return ids;
  }, [sanctions, eventFilter, specificEventFilter, getEventTypeFromSanction]);

  const filteredMembers = useMemo(() => {
    const q = (search || '').toLowerCase();
    const noActiveFilters = eventFilter === 'all' && specificEventFilter === 'all';
    return members.filter(m => {
      const inSearch = !q || (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q);
      const inSanctions = filteredSanctionMemberIds.size === 0 ? noActiveFilters : filteredSanctionMemberIds.has(m.id || m.studentId || m._id || m.id);
      return inSearch && inSanctions;
    });
  }, [members, filteredSanctionMemberIds, search, eventFilter, specificEventFilter]);

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease-out' }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Members</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Filter members by event type or event.</Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search members" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Event Type</InputLabel>
              <Select value={eventFilter} label="Event Type" onChange={(e) => setEventFilter(e.target.value)}>
                <MenuItem value="all">All Types</MenuItem>
                {eventTypeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Event</InputLabel>
              <Select value={specificEventFilter} label="Event" onChange={(e) => setSpecificEventFilter(e.target.value)}>
                <MenuItem value="all">All Events</MenuItem>
                {uniqueEvents.map(ev => <MenuItem key={ev} value={ev}>{ev.length > 40 ? ev.substring(0, 40) + '...' : ev}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row">
              <Button size="small" onClick={() => { setEventFilter('all'); setSpecificEventFilter('all'); setSearch(''); }}></Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #eee' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f7f7f7' }}>
              <TableCell sx={{ fontWeight: 700 }}>Member ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Balance</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Sanctions Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers.map(m => {
              const sanctionsCount = sanctions.filter(s => (s.memberId === m.id || s.studentId === m.id || s.memberId === m.studentId)).length;
              const displayName = m.name || [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Unnamed';
              return (
                <TableRow key={m.id || m._id} hover>
                  <TableCell>{m.id || m.studentId || m._id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#800000' }}>{(displayName || 'U').split(' ').map(p => p[0]).join('').slice(0, 2)}</Avatar>
                      <Typography sx={{ fontWeight: 600 }}>{displayName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {m.course || '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {m.pageNumber ? `Page ${m.pageNumber}` : '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>₱{m.balance || 0}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{sanctionsCount}</TableCell>
                </TableRow>
              );
            })}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No members found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

MembersList.propTypes = {
  members: PropTypes.array,
  sanctions: PropTypes.array,
  eventOptions: PropTypes.shape({
    titles: PropTypes.array,
    types: PropTypes.array,
    typeByTitle: PropTypes.object
  })
};

export default MembersList;
