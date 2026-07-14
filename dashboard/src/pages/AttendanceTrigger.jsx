import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Select, 
  FormControl, 
  InputLabel, 
  Container,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from '@mui/material';

function AttendanceTrigger({ 
  members, 
  rules, 
  simMemberId, 
  setSimMemberId, 
  simEventType, 
  setSimEventType, 
  simCustomEventName, 
  setSimCustomEventName, 
  handleTriggerAbsence 
}) {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeMember, setActiveMember] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return members;
    const query = search.toLowerCase();
    return members.filter(m => 
      m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
    );
  }, [members, search]);

  const handleOpenDialog = (member) => {
    setActiveMember(member);
    setSimMemberId(member.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setActiveMember(null);
  };

  const onSubmit = (e) => {
    handleTriggerAbsence(e);
    handleCloseDialog();
  };

  return (
    <Container maxWidth="md" sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Card sx={{ border: '1px solid #eeeeee', boxShadow: 'none' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            Record Member Absences
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Locate a member below to assess an unexcused absence infraction and apply the corresponding fine.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Search members by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 3 }}
          />

          <TableContainer component={Paper} sx={{ maxHeight: { xs: 320, md: 400 }, overflowX: 'auto', boxShadow: 'none', border: '1px solid #eeeeee' }}>
            <Table stickyHeader sx={{ minWidth: { xs: 340, md: 'auto' } }}>
              <TableHead>
                <TableRow>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff' }}>Member</TableCell>
                  <TableCell style={{ backgroundColor: '#800000', color: '#ffffff' }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#ffffff', fontSize: '0.85rem' }}>
                          {m.name.split(' ').map(n=>n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="outlined" 
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(m)}
                      >
                        Record Absence
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Record Absence Dialog Modal */}
      {dialogOpen && activeMember && (
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
          PaperProps={{
            sx: {
              borderRadius: 4,
              width: { xs: '95%', sm: 450 },
              maxWidth: '95vw',
              backgroundColor: '#ffffff',
              border: '1px solid #eeeeee'
            }
          }}
        >
          <form onSubmit={onSubmit}>
            <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>
              Record Absence Infraction
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Member</Typography>
                <Typography variant="body1" fontWeight={600}>{activeMember.name} ({activeMember.id})</Typography>
              </Box>

              <FormControl fullWidth>
                <InputLabel id="sim-event-select-label">Infraction Category</InputLabel>
                <Select
                  labelId="sim-event-select-label"
                  value={simEventType}
                  label="Infraction Category"
                  onChange={(e) => setSimEventType(e.target.value)}
                >
                  <MenuItem value="meeting">Meeting (₱{rules.meeting} Fine)</MenuItem>
                  <MenuItem value="major_event">Major Event (₱{rules.major_event} Fine)</MenuItem>
                  <MenuItem value="special_event">Special Event (₱{rules.special_event} Fine)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Event Name / Description"
                placeholder="e.g. Weekly Assembly #4, Midterm Seminar"
                value={simCustomEventName}
                onChange={(e) => setSimCustomEventName(e.target.value)}
                error={Boolean(simCustomEventName && (simCustomEventName.trim().length < 3 || simCustomEventName.trim().length > 100))}
                helperText={
                  simCustomEventName && simCustomEventName.trim().length < 3
                    ? "Description must be at least 3 characters long"
                    : simCustomEventName && simCustomEventName.trim().length > 100
                    ? "Description cannot exceed 100 characters"
                    : ""
                }
                required
              />
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" color="primary" sx={{ color: '#fff' }}>
                Confirm Absence
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </Container>
  );
}

export default AttendanceTrigger;
