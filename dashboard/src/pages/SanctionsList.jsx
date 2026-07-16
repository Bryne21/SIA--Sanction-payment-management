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
  Grid
} from '@mui/material';

function SanctionsList({ sanctions }) {
  const [search, setSearch] = useState('');

  const filteredSanctions = useMemo(() => {
    if (!search) return sanctions;
    const query = search.toLowerCase();
    return sanctions.filter(s => 
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.memberName && s.memberName.toLowerCase().includes(query)) ||
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      (s.description && s.description.toLowerCase().includes(query)) ||
      (s.event && s.event.toLowerCase().includes(query))
    );
  }, [sanctions, search]);

  const uniqueMembersCount = useMemo(() => {
    const memberIds = new Set(sanctions.map(s => s.studentId || s.memberId));
    return memberIds.size;
  }, [sanctions]);

  const mostCommonEvent = useMemo(() => {
    if (!sanctions.length) return 'None';
    const counts = {};
    sanctions.forEach(s => {
      const desc = s.description || s.event || 'Unspecified';
      counts[desc] = (counts[desc] || 0) + 1;
    });
    let maxCount = 0;
    let common = 'None';
    Object.entries(counts).forEach(([event, count]) => {
      if (count > maxCount) {
        maxCount = count;
        common = event;
      }
    });
    return common;
  }, [sanctions]);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Recorded Sanctions</Typography>
              <Typography variant="h4" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
                {sanctions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Unique Flagged Members</Typography>
              <Typography variant="h4" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
                {uniqueMembersCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Most Common Absence Event</Typography>
              <Typography variant="h6" noWrap color="primary.main" sx={{ mt: 1.5, fontWeight: 700 }}>
                {mostCommonEvent}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sanctions List Card */}
      <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none', backgroundColor: '#ffffff' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Sanctioned Absences Record</Typography>
          
          <TextField
            fullWidth
            size="small"
            label="Search sanctions by member name, student ID, or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 3 }}
          />

          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #eeeeee', maxHeight: 450, overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff', fontWeight: 600 }}>Member</TableCell>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff', fontWeight: 600 }}>Student ID</TableCell>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff', fontWeight: 600 }}>Event Description</TableCell>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff', fontWeight: 600 }}>Fine Amount</TableCell>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff', fontWeight: 600 }}>Processed Date</TableCell>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff', fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSanctions.map((s) => {
                  const mName = s.memberName || s.name || 'Unnamed Member';
                  return (
                    <TableRow key={s.id || s._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#ffffff', fontSize: '0.85rem' }}>
                            {mName.split(' ').map(n=>n[0]).join('')}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>{mName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{s.studentId || s.memberId}</TableCell>
                      <TableCell>{s.description || s.event}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                        ₱{s.amount || 50}
                      </TableCell>
                      <TableCell>{s.processedAt || s.date}</TableCell>
                      <TableCell>
                        <Chip
                          label={s.status ? s.status.toUpperCase() : 'ABSENT'}
                          color="error"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredSanctions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No sanctions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SanctionsList;
