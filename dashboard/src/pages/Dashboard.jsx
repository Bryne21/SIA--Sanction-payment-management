import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Chip 
} from '@mui/material';

function Dashboard({ stats, chartData, auditLogs, setActiveTab }) {
  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                <Typography variant="body2" fontWeight={500}>Outstanding Fines</Typography>
                <Typography variant="body2">₱</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                ₱{stats.totalOutstanding.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ⚠️ {stats.badStandingCount} members flagged restricted
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                <Typography variant="body2" fontWeight={500}>Total Collected</Typography>
                <Typography variant="body2">₱</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                ₱{stats.totalCollected.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="success.main">
                📈 Collection Rate: {stats.rate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                <Typography variant="body2" fontWeight={500}>Total Fines Assessed</Typography>
                <Typography variant="body2">₱</Typography>
              </Box>
              <Typography variant="h4">
                ₱{stats.totalFines.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📊 Combined system ledger size
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart & Alerts section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* SVG Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Assessed Fines by Category</Typography>
              <Box sx={{ 
                height: 200, 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'space-around',
                pt: 2
              }}>
                {chartData.map((item, idx) => {
                  const maxVal = Math.max(...chartData.map(d => d.val)) || 100;
                  const heightPct = `${Math.max(8, (item.val / maxVal) * 80)}%`;
                  return (
                    <Box key={idx} sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      width: '30%',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: 1
                    }}>
                      <Typography variant="caption" fontWeight={600}>₱{item.val}</Typography>
                      <Box sx={{ 
                        width: '60%', 
                        height: heightPct, 
                        background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 0 10px rgba(0, 242, 254, 0.15)',
                        transition: 'height 0.5s ease'
                      }} />
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Alerts */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">Registry Standing Status</Typography>
              
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center', 
                p: 2, 
                borderRadius: 3, 
                border: '1px solid rgba(239, 68, 68, 0.25)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)'
              }}>
                <Typography variant="h5">🚫</Typography>
                <Box>
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    {stats.badStandingCount} Flagged Accounts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Members with ₱150+ balance are flagged "Not in Good Standing".
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center', 
                p: 2, 
                borderRadius: 3, 
                border: '1px solid rgba(16, 185, 129, 0.25)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)'
              }}>
                <Typography variant="h5">✅</Typography>
                <Box>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    {stats.totalOutstanding === 0 ? "All Clear" : "Good Standing"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active members with acceptable balances.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Logs List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Recent Activity Logs</Typography>
            <Button size="small" onClick={() => setActiveTab("audit")}>View All</Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {auditLogs.slice(0, 3).map(log => (
              <Box 
                key={log.id} 
                sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip 
                    label={log.type === 'fine_generated' ? 'Fine' : log.type === 'payment_received' ? 'Payment' : 'Config'} 
                    color={log.type === 'fine_generated' ? 'error' : log.type === 'payment_received' ? 'success' : 'primary'}
                    size="small"
                  />
                  <Typography variant="body2">{log.message}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{log.timestamp}</Typography>
              </Box>
            ))}
            {auditLogs.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center">No logs yet.</Typography>
            )}
          </Box>
        </CardContent>
      </Card>

    </Box>
  );
}

export default Dashboard;
