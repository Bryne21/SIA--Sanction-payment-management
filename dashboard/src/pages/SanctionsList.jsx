import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../api/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Avatar,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';

function SanctionsList({ sanctions, eventOptions = {}, onSanctionsChange }) {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [specificEventFilter, setSpecificEventFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [updatingSanctionId, setUpdatingSanctionId] = useState(null);
  const itemsPerPage = 6;

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

  const normalizeForCompare = (v) => String(v || '').toLowerCase().trim();

  const titleToTypeMap = useMemo(() => {
    return eventOptions?.typeByTitle && typeof eventOptions.typeByTitle === 'object'
      ? eventOptions.typeByTitle
      : {};
  }, [eventOptions]);

  const getEventTitleValue = useCallback((record) => {
    const raw = record?.eventTitle || record?.description || record?.event || '';
    let title = String(raw).trim();
    if (!title) return '';

    title = title.replace(/^Unexcused Absence\s*-\s*/i, '').trim();
    return title;
  }, []);

  const getEventTypeFromRecord = useCallback((record) => {
    const explicitType = normalizeEventTypeLabel(record?.eventType || record?.type || record?.event?.type || record?.event_type || '');
    if (explicitType) return explicitType;

    const eventTitle = getEventTitleValue(record);
    if (eventTitle) {
      const titleKey = String(eventTitle).trim().toLowerCase();
      const titleType = normalizeEventTypeLabel(titleToTypeMap[titleKey]);
      if (titleType) return titleType;
    }

    const text = `${record.description || ''} ${record.event || ''}`.toLowerCase();
    if (text.includes('seminar') || text.includes('jpice') || text.includes('micro seminar')) return 'Seminar';
    if (text.includes('webinar')) return 'Webinar';
    if (text.includes('workshop')) return 'Workshop';
    if (text.includes('meeting')) return 'Meeting';
    if (text.includes('sports') || text.includes('game') || text.includes('athletic')) return 'Sports';
    if (text.includes('social') || text.includes('gathering') || text.includes('party') || text.includes('ava')) return 'Social';
    return 'Other';
  }, [getEventTitleValue, titleToTypeMap]);

  const eventTypeOptions = useMemo(() => {
    // Preferred display order matching screenshot
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
    const filtered = fromCollection.filter((title) => {
      if (eventFilter === 'all') return true;
      const titleKey = String(title || '').trim().toLowerCase();
      const titleType = normalizeEventTypeLabel(titleToTypeMap[titleKey]);
      return normalizeForCompare(titleType) === normalizeForCompare(eventFilter);
    });
    return [...new Set(filtered)].sort();
  }, [eventFilter, eventOptions, titleToTypeMap]);

  

  const getPaymentStatus = (record) => {
    const raw = record?.paymentStatus || record?.payment_status || (record?.isPaid ? 'paid' : 'unpaid');
    return String(raw).toLowerCase() === 'paid' ? 'paid' : 'unpaid';
  };

  const unpaidSanctionsCount = useMemo(() => {
    return sanctions.filter((sanction) => getPaymentStatus(sanction) === 'unpaid').length;
  }, [sanctions]);

  const affectedMembersCount = useMemo(() => {
    const memberIds = new Set(
      sanctions
        .filter((sanction) => getPaymentStatus(sanction) === 'unpaid')
        .map((sanction) => sanction.studentId || sanction.memberId || sanction.memberName || sanction.name)
        .filter(Boolean)
    );
    return memberIds.size;
  }, [sanctions]);

  const filteredSanctions = useMemo(() => {
    let result = sanctions;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(s =>
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.memberName && s.memberName.toLowerCase().includes(query)) ||
        (s.studentId && s.studentId.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.event && s.event.toLowerCase().includes(query))
      );
    }

    if (eventFilter !== 'all') {
      result = result.filter(s => normalizeForCompare(getEventTypeFromRecord(s)) === normalizeForCompare(eventFilter));
    }

    if (specificEventFilter !== 'all') {
      result = result.filter(s => getEventTitleValue(s) === specificEventFilter);
    }

    return result;
  }, [sanctions, search, eventFilter, specificEventFilter, getEventTypeFromRecord, getEventTitleValue]);

  const totalPages = Math.ceil(filteredSanctions.length / itemsPerPage);
  const paginatedSanctions = filteredSanctions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const togglePaidStatus = async (sanction) => {
    const sanctionId = sanction.id || sanction._id;
    const nextStatus = getPaymentStatus(sanction) === 'paid' ? 'unpaid' : 'paid';

    try {
      setUpdatingSanctionId(sanctionId);
      const response = await apiClient.patch(`/api/sanctions/${encodeURIComponent(sanctionId)}/payment-status`, {
        paymentStatus: nextStatus
      });

      if (onSanctionsChange) {
        onSanctionsChange(response.data.state?.sanctions || [], response.data.state);
      }
    } catch (error) {
      console.error('Failed to update sanction payment status:', error);
    } finally {
      setUpdatingSanctionId(null);
    }
  };

  const isPaid = (sanction) => getPaymentStatus(sanction) === 'paid';

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Summary Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff', borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Recorded Sanctions</Typography>
            <Typography variant="h4" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
              {sanctions.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff', borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Absences</Typography>
            <Typography variant="h4" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
              {unpaidSanctionsCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff', borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Affected Members</Typography>
            <Typography variant="h4" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
              {affectedMembersCount}
            </Typography>
          </CardContent>
        </Card>
        
      </Box>

      {/* Main Card */}
      <Card sx={{ 
        border: '1px solid #eeeeee', 
        boxShadow: 'none', 
        backgroundColor: '#ffffff',
        borderRadius: 2
      }}>
        <CardContent sx={{ p: 4 }}>
          {/* Title Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
              Sanctioned Absences ({filteredSanctions.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and filter sanction records by member and seminar event.
            </Typography>
          </Box>

          {/* Search and Filter Section */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField
              placeholder="Enter Student Credentials"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ 
                flex: 1, 
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: '#ffffff'
                }
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={eventFilter}
                label="Event Type"
                onChange={(e) => {
                  setEventFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Types</MenuItem>
                {eventTypeOptions.map((typeOption) => (
                  <MenuItem key={typeOption} value={typeOption}>
                    {typeOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Event</InputLabel>
              <Select
                value={specificEventFilter}
                label="Event"
                onChange={(e) => {
                  setSpecificEventFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Events</MenuItem>
                {uniqueEvents.map((event) => (
                  <MenuItem key={event} value={event}>
                    {event.length > 30 ? event.substring(0, 30) + '...' : event}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Table Section */}
          <TableContainer component={Paper} sx={{ 
            boxShadow: 'none', 
            border: '1px solid #eeeeee',
            borderRadius: 1,
            overflow: 'auto'
          }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #eeeeee' }}>
                    Student ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #eeeeee' }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #eeeeee' }}>
                    Event
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #eeeeee' }}>
                    Event Type
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #eeeeee' }}>
                    Fine Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', borderBottom: '2px solid #eeeeee' }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSanctions.map((s) => {
                  const mName = s.memberName || s.name || 'Unnamed Member';
                  return (
                    <TableRow key={s.id || s._id} hover sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                      <TableCell sx={{ py: 2, color: '#555555', fontWeight: 600 }}>
                        {s.studentId || s.memberId || '-'}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: '#800000', 
                            color: '#ffffff', 
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {mName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                            {mName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2, color: '#555555' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{getEventTitleValue(s) || 'Unknown Event'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2, color: '#555555' }}>
                        <Chip label={getEventTypeFromRecord(s)} size="small" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }} />
                      </TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700, color: '#800000' }}>
                        ₱{s.amount || 100}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={isPaid(s) ? 'PAID' : 'UNPAID'}
                          size="small"
                          onClick={() => togglePaidStatus(s)}
                          disabled={updatingSanctionId === (s.id || s._id)}
                          sx={{ 
                            backgroundColor: isPaid(s) ? '#c8e6c9' : '#ffebee',
                            color: isPaid(s) ? '#2e7d32' : '#800000',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedSanctions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No sanctions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {Math.min((page - 1) * itemsPerPage + 1, filteredSanctions.length)} - {Math.min(page * itemsPerPage, filteredSanctions.length)} of {filteredSanctions.length}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  disabled={page === 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                  sx={{ minWidth: 32, height: 32, p: 0 }}
                >
                  ‹
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Button
                    key={p}
                    size="small"
                    onClick={() => setPage(p)}
                    sx={{
                      minWidth: 32,
                      height: 32,
                      p: 0,
                      backgroundColor: page === p ? '#800000' : 'transparent',
                      color: page === p ? '#ffffff' : '#1a1a1a',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: page === p ? '#800000' : '#f5f5f5'
                      }
                    }}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="small"
                  disabled={page === totalPages}
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  sx={{ minWidth: 32, height: 32, p: 0 }}
                >
                  ›
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

SanctionsList.propTypes = {
  sanctions: PropTypes.array,
  eventOptions: PropTypes.shape({
    titles: PropTypes.array,
    types: PropTypes.array,
    typeByTitle: PropTypes.object
  }),
  onSanctionsChange: PropTypes.func
};

export default SanctionsList;
