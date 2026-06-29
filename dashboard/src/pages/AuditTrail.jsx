import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip 
} from '@mui/material';

function AuditTrail({ auditLogs }) {
  return (
    <Card sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>System Audit Log</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {auditLogs.map(log => (
            <Box 
              key={log.id} 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                backgroundColor: 'rgba(255,255,255,0.015)', 
                border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Chip 
                  label={log.type === 'fine_generated' ? 'Fine Assessed' : log.type === 'payment_received' ? 'Payment Cleared' : 'Rule Override'} 
                  color={log.type === 'fine_generated' ? 'error' : log.type === 'payment_received' ? 'success' : 'primary'}
                  size="small"
                />
                <Typography variant="body2">{log.message}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">{log.timestamp}</Typography>
            </Box>
          ))}
          {auditLogs.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center">No audit records.</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default AuditTrail;
