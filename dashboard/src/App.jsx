import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Avatar, 
  Alert,
  Container
} from '@mui/material';
import { getState } from './api/client';

// Import Pages
import SanctionsList from './pages/SanctionsList';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#800000' }, // Maroon
    secondary: { main: '#800000' },
    background: { default: '#fafafa', paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#555555' },
    error: { main: '#800000' },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' }
  },
  typography: {
    fontFamily: '"Inter", "Outfit", sans-serif',
    h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.5px', color: '#800000' },
    h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: '#800000' }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
          border: '1px solid #eeeeee',
          borderRadius: 12,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#800000',
            backgroundColor: '#fffdfd',
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, textTransform: 'none', padding: '8px 20px' }
      }
    }
  }
});

function App() {
  const [sanctions, setSanctions] = useState([]);
  const [eventOptions, setEventOptions] = useState({ titles: [], types: [] });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const syncState = () => {
    getState()
      .then(res => {
        setSanctions(res.data.sanctions || []);
        setEventOptions(res.data.eventOptions || { titles: [], types: [] });
      })
      .catch(err => {
        console.error(err);
        showToast("Error connecting to server backend", "error");
      });
  };

  useEffect(() => {
    syncState();
  }, []);

  const showToast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
    setTimeout(() => setNotification(prev => ({ ...prev, open: false })), 4000);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pb: 6 }}>
        {/* Navigation AppBar */}
        <AppBar position="static" sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #eeeeee', boxShadow: 'none' }} color="transparent">
          <Container maxWidth="lg">
            <Toolbar sx={{ justifyContent: 'space-between', p: '0 !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="img"
                  src="/logo.png"
                  alt="SIA Logo"
                  sx={{ height: 48, width: 48, objectFit: 'contain' }}
                />
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: '"Outfit", sans-serif' }}>
                  SanctionPay
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right' }}>Sanction Manager</Typography>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        {/* Main Content Area */}
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 800 }}>
              Sanctions Directory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time directory of student absences and associated sanction records.
            </Typography>
          </Box>

          {notification.open && (
            <Alert severity={notification.severity} sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setNotification(prev => ({ ...prev, open: false }))}>
              {notification.message}
            </Alert>
          )}

          <SanctionsList sanctions={sanctions} eventOptions={eventOptions} />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
