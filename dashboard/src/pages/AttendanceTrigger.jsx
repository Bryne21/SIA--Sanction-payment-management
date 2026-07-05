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
      <Card sx={{ border: '1px dashed #800000', backgroundColor: 'rgba(128, 0, 0, 0.02)', boxShadow: 'none' }}>
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
                  <option key={m.id} value={m.id}>
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
                <option value="meeting">Meeting (₱{rules.meeting} Fine)</option>
                <option value="major_event">Major Event (₱{rules.major_event} Fine)</option>
                <option value="special_event">Special Event (₱{rules.special_event} Fine)</option>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="3. Event Name / Description"
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
              sx={{ mb: 4 }}
            />

            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              size="large"
              sx={{ color: '#fff', fontWeight: 'bold' }}
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
