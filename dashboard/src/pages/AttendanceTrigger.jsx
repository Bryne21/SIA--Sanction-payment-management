import React from 'react';
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
  Container 
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
  return (
    <Container maxWidth="md" sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Card sx={{ border: '1px dashed #00f2fe', backgroundColor: 'rgba(0, 242, 254, 0.02)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>⚡</span> Simulate Attendance Webhook
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            In production, when a moderator logs an "Unexcused Absence" in the Attendance module, a background webhook triggers this module to check fine schedules and instantly apply appropriate balances.
          </Typography>

          <form onSubmit={handleTriggerAbsence}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="sim-member-select-label">1. Select Absent Member</InputLabel>
              <Select
                labelId="sim-member-select-label"
                value={simMemberId}
                label="1. Select Absent Member"
                onChange={(e) => setSimMemberId(e.target.value)}
                required
              >
                {members.map(m => (
                  <option key={m.id} value={m.id} style={{ backgroundColor: '#111524', color: '#fff', padding: 8 }}>
                    {m.name} (Balance: ₱{m.balance} | Status: {m.standing})
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="sim-event-select-label">2. Infraction Category (Selects Fine Rule)</InputLabel>
              <Select
                labelId="sim-event-select-label"
                value={simEventType}
                label="2. Infraction Category (Selects Fine Rule)"
                onChange={(e) => setSimEventType(e.target.value)}
              >
                <option value="meeting" style={{ backgroundColor: '#111524', color: '#fff', padding: 8 }}>Meeting (₱{rules.meeting} Fine)</option>
                <option value="major_event" style={{ backgroundColor: '#111524', color: '#fff', padding: 8 }}>Major Event (₱{rules.major_event} Fine)</option>
                <option value="special_event" style={{ backgroundColor: '#111524', color: '#fff', padding: 8 }}>Special Event (₱{rules.special_event} Fine)</option>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="3. Event Name / Description"
              placeholder="e.g. Weekly Assembly #4, Midterm Seminar"
              value={simCustomEventName}
              onChange={(e) => setSimCustomEventName(e.target.value)}
              required
              sx={{ mb: 4 }}
            />

            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              size="large"
              sx={{ color: '#000', fontWeight: 'bold' }}
            >
              ⚡ Process Attendance Infraction & Assess Fine
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

export default AttendanceTrigger;
