import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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
  Alert
} from '@mui/material';

// Import Pages
import AttendanceTrigger from './pages/AttendanceTrigger';
import MemberLedger from './pages/MemberLedger';
import SanctionRules from './pages/SanctionRules';


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
const STANDING_THRESHOLD = 150;

function App() {
  const [members, setMembers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [rules, setRules] = useState({ meeting: 50, major_event: 100, special_event: 150 });


  const [activeTab, setActiveTab] = useState("ledger");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [receiptRef, setReceiptRef] = useState("");

  const [simMemberId, setSimMemberId] = useState("");
  const [simEventType, setSimEventType] = useState("meeting");
  const [simCustomEventName, setSimCustomEventName] = useState("");

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const syncState = () => {
    axios.get('/api/state')
      .then(res => {
        setMembers(res.data.members || []);
        setLedger(res.data.ledger || []);
        setRules(res.data.rules || { meeting: 50, major_event: 100, special_event: 150 });

        if (res.data.members && res.data.members.length > 0) {
          if (!selectedMemberId) setSelectedMemberId(res.data.members[0].id);
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



  const selectedMember = useMemo(() => members.find(m => m.id === selectedMemberId), [members, selectedMemberId]);
  const selectedMemberHistory = useMemo(() => {
    return ledger.filter(tx => tx.memberId === selectedMemberId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [ledger, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(m => 
      m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);



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

    axios.post('/api/infraction', { memberId: simMemberId, eventType: simEventType, customEventName: simCustomEventName })
      .then(res => {
        setMembers(res.data.members);
        setLedger(res.data.ledger);

        setSelectedMemberId(simMemberId);
        setSimCustomEventName("");
        showToast("Assessed absence fine successfully");
        setActiveTab("ledger");
      })
      .catch(err => showToast(err.response?.data?.error || "Failed to process infraction", "error"));
  };

  const handleProcessPaymentSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!selectedMember) {
      showToast("No member selected.", "error");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      showToast("Payment amount must be a positive number greater than 0.", "error");
      return;
    }
    if (amt > selectedMember.balance) {
      showToast(`Payment amount exceeds member's outstanding balance of ₱${selectedMember.balance}.`, "error");
      return;
    }
    if (paymentType === 'receipt') {
      if (!receiptRef || receiptRef.trim().length < 5) {
        showToast("Digital receipt payments require a reference code of at least 5 characters.", "error");
        return;
      }
    }

    axios.post('/api/payment', { memberId: selectedMember.id, amount: amt, type: paymentType, reference: receiptRef })
      .then(res => {
        setMembers(res.data.members);
        setLedger(res.data.ledger);

        setPaymentModalOpen(false);
        setPaymentAmount("");
        setReceiptRef("");
        showToast("Payment recorded successfully");
      })
      .catch(err => showToast(err.response?.data?.error || "Payment failed", "error"));
  };

  const handleUpdateRules = (type, val) => {
    const num = Number(val);
    if (!Number.isInteger(num) || num < 0 || num > 10000) {
      showToast("Rules value must be a whole number between 0 and 10,000.", "error");
      return;
    }

    axios.post('/api/rules', { ...rules, [type]: num })
      .then(res => {
        setRules(res.data.rules);

        showToast("Rules updated successfully");
      })
      .catch(err => showToast(err.response?.data?.error || "Failed to update rules", "error"));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Drawer
          variant="permanent"
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
            {[
              { id: 'ledger', label: 'Member Ledger', icon: '📂' },
              { id: 'simulator', label: 'Record Absences', icon: '⚡' },
              { id: 'rules', label: 'Sanction Rules', icon: '⚙️' },
            ].map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  selected={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
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

        <Box component="main" sx={{ flexGrow: 1, p: 4, width: `calc(100% - ${drawerWidth}px)` }}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4 }}>
            <Toolbar sx={{ justifyContent: 'space-between', p: '0 !important' }}>
              <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {activeTab === 'simulator' && "Record Member Absences"}
                  {activeTab === 'ledger' && "Member Financial Ledger"}
                  {activeTab === 'rules' && "Sanction Policy & Rules"}
                </Typography>
              </Box>
              <Button variant="contained" color="primary" onClick={() => setActiveTab("simulator")} startIcon={<span>⚡</span>} sx={{ color: '#fff' }}>
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
              rules={rules} 
              simMemberId={simMemberId} 
              setSimMemberId={setSimMemberId} 
              simEventType={simEventType} 
              setSimEventType={setSimEventType} 
              simCustomEventName={simCustomEventName} 
              setSimCustomEventName={setSimCustomEventName} 
              handleTriggerAbsence={handleTriggerAbsence} 
            />
          )}
          {activeTab === 'ledger' && (
            <MemberLedger 
              members={filteredMembers} 
              ledger={ledger} 
              selectedMemberId={selectedMemberId} 
              setSelectedMemberId={setSelectedMemberId} 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              paymentAmount={paymentAmount} 
              setPaymentAmount={setPaymentAmount} 
              paymentType={paymentType} 
              setPaymentType={setPaymentType} 
              receiptRef={receiptRef} 
              setReceiptRef={setReceiptRef} 
              paymentModalOpen={paymentModalOpen} 
              setPaymentModalOpen={setPaymentModalOpen} 
              handleProcessPaymentSubmit={handleProcessPaymentSubmit} 
              STANDING_THRESHOLD={STANDING_THRESHOLD} 
              selectedMember={selectedMember} 
              selectedMemberHistory={selectedMemberHistory} 
            />
          )}
          {activeTab === 'rules' && (
            <SanctionRules rules={rules} handleUpdateRules={handleUpdateRules} />
          )}

        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
