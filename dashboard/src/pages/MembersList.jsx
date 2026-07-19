import React, { useState, useMemo } from 'react';
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

  const uniqueEvents = useMemo(() => {
    const fromCollection = Array.isArray(eventOptions?.titles) ? eventOptions.titles.filter(Boolean) : [];
    return [...new Set(fromCollection)].sort();
  }, [eventOptions]);

  // Filter sanctions by selected filters, then derive member ids
  const filteredSanctionMemberIds = useMemo(() => {
    let result = sanctions;
    if (eventFilter !== 'all') {
      result = result.filter(s => {
        const type = normalizeEventTypeLabel(s.eventType || s.type || s.event_type || s.type);
        return String(type || '').toLowerCase() === String(eventFilter || '').toLowerCase();
      });
    }
    if (specificEventFilter !== 'all') {
      result = result.filter(s => (s.event || s.description || '').toString() === specificEventFilter || (s.event || '') === specificEventFilter);
    }
    const ids = new Set(result.map(s => s.memberId || s.studentId || s.id).filter(Boolean));
    return ids;
  }, [sanctions, eventFilter, specificEventFilter]);

  const filteredMembers = useMemo(() => {
    const q = (search || '').toLowerCase();
    return members.filter(m => {
      const inSearch = !q || (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q);
      const inSanctions = filteredSanctionMemberIds.size === 0 ? true : filteredSanctionMemberIds.has(m.id || m.studentId || m._id || m.id);
      return inSearch && inSanctions;
    });
  }, [members, filteredSanctionMemberIds, search]);

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
              <Button size="small" onClick={() => { setEventFilter('all'); setSpecificEventFilter('all'); setSearch(''); }}>Reset</Button>
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
              <TableCell sx={{ fontWeight: 700 }}>Balance</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Sanctions Count</TableCell>
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
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#800000' }}>{(displayName || 'U').split(' ').map(p => p[0]).join('').slice(0,2)}</Avatar>
                      <Typography sx={{ fontWeight: 600 }}>{displayName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>₱{m.balance || 0}</TableCell>
                  <TableCell>{sanctionsCount}</TableCell>
                </TableRow>
              );
            })}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No members found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default MembersList;
