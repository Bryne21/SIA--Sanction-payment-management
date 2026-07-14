import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Alert, 
  Container 
} from '@mui/material';

function SanctionRules({ rules, handleUpdateRules }) {
  return (
    <Container maxWidth="md" sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>Absence Fine Schedules</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Fine rates evaluated dynamically by the sanction engine when unexcused attendance webhooks log infractions.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, p: 2, borderRadius: 2, border: '1px solid #eeeeee', backgroundColor: '#fafafa' }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>Organization Meetings</Typography>
                <Typography variant="caption" color="text.secondary">Evaluated on general or committee alignments.</Typography>
              </Box>
              <TextField 
                type="number"
                size="small"
                label="Amount"
                value={rules.meeting}
                onChange={(e) => handleUpdateRules('meeting', e.target.value)}
                inputProps={{ min: 0, max: 10000, step: 1 }}
                error={Boolean(rules.meeting < 0 || rules.meeting > 10000 || !Number.isInteger(Number(rules.meeting)))}
                helperText={
                  rules.meeting < 0 || rules.meeting > 10000 || !Number.isInteger(Number(rules.meeting))
                    ? "Must be a whole number between 0 and 10,000"
                    : ""
                }
                InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>₱</Typography> }}
                sx={{ width: 120 }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, p: 2, borderRadius: 2, border: '1px solid #eeeeee', backgroundColor: '#fafafa' }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>Major Events</Typography>
                <Typography variant="caption" color="text.secondary">Evaluated on general assemblies and college elections.</Typography>
              </Box>
              <TextField 
                type="number"
                size="small"
                label="Amount"
                value={rules.major_event}
                onChange={(e) => handleUpdateRules('major_event', e.target.value)}
                inputProps={{ min: 0, max: 10000, step: 1 }}
                error={Boolean(rules.major_event < 0 || rules.major_event > 10000 || !Number.isInteger(Number(rules.major_event)))}
                helperText={
                  rules.major_event < 0 || rules.major_event > 10000 || !Number.isInteger(Number(rules.major_event))
                    ? "Must be a whole number between 0 and 10,000"
                    : ""
                }
                InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>₱</Typography> }}
                sx={{ width: { xs: '100%', md: 120 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, p: 2, borderRadius: 2, border: '1px solid #eeeeee', backgroundColor: '#fafafa' }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>Special Events</Typography>
                <Typography variant="caption" color="text.secondary">Evaluated on leadership training camps or seminars.</Typography>
              </Box>
              <TextField 
                type="number"
                size="small"
                label="Amount"
                value={rules.special_event}
                onChange={(e) => handleUpdateRules('special_event', e.target.value)}
                inputProps={{ min: 0, max: 10000, step: 1 }}
                error={Boolean(rules.special_event < 0 || rules.special_event > 10000 || !Number.isInteger(Number(rules.special_event)))}
                helperText={
                  rules.special_event < 0 || rules.special_event > 10000 || !Number.isInteger(Number(rules.special_event))
                    ? "Must be a whole number between 0 and 10,000"
                    : ""
                }
                InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>₱</Typography> }}
                sx={{ width: { xs: '100%', md: 120 } }}
              />
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 4, borderRadius: '10px' }} icon={<span>💡</span>}>
            Modifications are logged in the audit trail. They apply immediately to new infractions and do not affect previously calculated fines.
          </Alert>
        </CardContent>
      </Card>
    </Container>
  );
}

export default SanctionRules;
