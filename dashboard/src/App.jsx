import React, { useState, useEffect, useMemo } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Avatar, 
  Button, 
  Alert,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { getState, logInfraction } from './api/client';

// Import Pages
import AttendanceTrigger from './pages/AttendanceTrigger';
import SanctionsList from './pages/SanctionsList';


const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#800000' }, // Maroon
    secondary: { main: '#800000' },
    background: { default: '#ffffff', paper: '#fcfcfc' },
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

const drawerWidth = 280;

function App() {
  const appTheme = useTheme();
  const isMobile = useMediaQuery(appTheme.breakpoints.down('md'));
  const [members, setMembers] = useState([]);
  const [sanctions, setSanctions] = useState([]);

  const [activeTab, setActiveTab] = useState("sanctions");
  const [simMemberId, setSimMemberId] = useState("");
  const [simEventType, setSimEventType] = useState("meeting");
  const [simCustomEventName, setSimCustomEventName] = useState("");

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'sanctions', label: 'Sanctions Directory', icon: '📂' },
    { id: 'simulator', label: 'Record Absences', icon: '⚡' },
  ];

  const syncState = () => {
    getState()
      .then(res => {
        setMembers(res.data.members || []);
        setSanctions(res.data.sanctions || []);

        if (res.data.members && res.data.members.length > 0) {
          if (!simMemberId) setSimMemberId(res.data.members[0].id);
        }
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

  const handleTriggerAbsence = (e) => {
    e.preventDefault();
    if (!simMemberId) {
      showToast("Please select an absent member.", "error");
      return;
    }
    if (!simCustomEventName || simCustomEventName.trim().length < 3 || simCustomEventName.trim().length > 100) {
      showToast("Event description must be between 3 and 100 characters.", "error");
      return;
    }

    logInfraction(simMemberId, simEventType, simCustomEventName)
      .then(res => {
        setMembers(res.data.members);
        setSanctions(res.data.sanctions);

        setSimCustomEventName("");
        showToast("Assessed absence fine successfully");
        setActiveTab("sanctions");
      })
      .catch(err => showToast(err.response?.data?.error || "Failed to process infraction", "error"));
  };

  const handleNavSelect = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              borderRight: '1px solid #eeeeee',
              padding: '24px 16px'
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', fontWeight: 800 }}>₱</Avatar>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              SanctionPay
            </Typography>
          </Box>

          <List sx={{ flexGrow: 1 }}>
            {navItems.map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={activeTab === item.id}
                  onClick={() => handleNavSelect(item.id)}
                  sx={{
                    borderRadius: '12px',
                    color: activeTab === item.id ? 'primary.main' : 'text.secondary',
                    '&.Mui-selected': { backgroundColor: 'rgba(128, 0, 0, 0.08)' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, fontSize: '1.25rem' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2, borderColor: '#eeeeee' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: '#fff' }}>AD</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Alex Diaz</Typography>
              <Typography variant="caption" color="text.secondary">Sanction Manager</Typography>
            </Box>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, minWidth: 0 }}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 3, bgcolor: 'transparent', boxShadow: 'none' }}>
            <Toolbar sx={{ justifyContent: 'space-between', p: '0 !important', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isMobile && (
                  <IconButton
                    color="primary"
                    onClick={() => setMobileOpen(true)}
                    sx={{ border: '1px solid #eeeeee', borderRadius: 2 }}
                    aria-label="Open navigation menu"
                  >
                    <span style={{ fontSize: '1.1rem' }}>☰</span>
                  </IconButton>
                )}
                <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ mb: 0.5 }}>
                  {activeTab === 'simulator' && 'Record Member Absences'}
                  {activeTab === 'sanctions' && 'Sanctions Directory'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setActiveTab('simulator')}
                startIcon={<span>⚡</span>}
                sx={{ color: '#fff', width: { xs: '100%', sm: 'auto' } }}
              >
                Record Absence
              </Button>
            </Toolbar>
          </AppBar>

          {notification.open && (
            <Alert severity={notification.severity} sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setNotification(prev => ({ ...prev, open: false }))}>
              {notification.message}
            </Alert>
          )}

          {activeTab === 'simulator' && (
            <AttendanceTrigger 
              members={members} 
              rules={{ meeting: 50, major_event: 50, special_event: 50 }} 
              simMemberId={simMemberId} 
              setSimMemberId={setSimMemberId} 
              simEventType={simEventType} 
              setSimEventType={setSimEventType} 
              simCustomEventName={simCustomEventName} 
              setSimCustomEventName={setSimCustomEventName} 
              handleTriggerAbsence={handleTriggerAbsence} 
            />
          )}
          {activeTab === 'sanctions' && (
            <SanctionsList sanctions={sanctions} />
          )}

        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
