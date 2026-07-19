import React, { useState, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';

function SanctionsList({ sanctions }) {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const getEventCategory = (record) => {
    const text = `${record.description || ''} ${record.event || ''}`.toLowerCase();
    if (text.includes('jpice')) return 'JPICE Seminar';
    if (text.includes('micro seminar') || text.includes('microseminar')) return 'Micro Seminar';
    return 'Other';
  };

  const uniqueMembersCount = useMemo(() => {
    const memberIds = new Set(sanctions.map(s => s.studentId || s.memberId));
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
      result = result.filter(s => getEventCategory(s) === eventFilter);
    }

    return result;
  }, [sanctions, search, eventFilter]);

  const totalPages = Math.ceil(filteredSanctions.length / itemsPerPage);
  const paginatedSanctions = filteredSanctions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

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
              {sanctions.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff', borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Affected Members</Typography>
            <Typography variant="h4" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
              {uniqueMembersCount}
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
                <MenuItem value="all">All Events</MenuItem>
                <MenuItem value="JPICE Seminar">JPICE Seminar</MenuItem>
                <MenuItem value="Micro Seminar">Micro Seminar</MenuItem>
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
                  const eventCategory = getEventCategory(s);
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
                        {eventCategory}
                      </TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700, color: '#800000' }}>
                        ₱{s.amount || 100}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label="SANCTION"
                          size="small"
                          sx={{ 
                            backgroundColor: '#ffebee',
                            color: '#800000',
                            fontWeight: 600,
                            fontSize: '0.75rem'
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

export default SanctionsList;
