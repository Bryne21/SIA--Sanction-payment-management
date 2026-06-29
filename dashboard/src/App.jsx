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
import Dashboard from './pages/Dashboard';
import AttendanceTrigger from './pages/AttendanceTrigger';
import MemberLedger from './pages/MemberLedger';
import SanctionRules from './pages/SanctionRules';
import AuditTrail from './pages/AuditTrail';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00f2fe' },
    secondary: { main: '#4facfe' },
    background: { default: '#0a0c14', paper: '#111524' },
    text: { primary: '#f8fafc', secondary: '#94a3b8' },
    error: { main: '#f87171' },
    success: { main: '#34d399' },
    warning: { main: '#fbbf24' }
  },
  typography: {
    fontFamily: '"Inter", "Outfit", sans-serif',
    h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.5px' },
    h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(22, 28, 45, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(0, 242, 254, 0.25)',
            transform: 'translateY(-2px)',
            backgroundColor: 'rgba(28, 36, 58, 0.8)',
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 600, textTransform: 'none', padding: '8px 20px' }
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
  const [auditLogs, setAuditLogs] = useState([]);

  const [activeTab, setActiveTab] = useState("dashboard");
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
        setAuditLogs(res.data.auditLogs || []);
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

  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalCollected = 0;
    let badStandingCount = 0;
    members.forEach(m => {
      totalOutstanding += m.balance;
      totalCollected += m.totalPaid;
      if (m.standing === "Not in Good Standing") badStandingCount++;
    });
    const totalFines = totalOutstanding + totalCollected;
    const rate = totalFines > 0 ? ((totalCollected / totalFines) * 100).toFixed(1) : "0.0";
    return { totalOutstanding, totalCollected, totalFines, rate, badStandingCount };
  }, [members]);

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

  const chartData = useMemo(() => {
    let meetingSum = 0, majorSum = 0, specialSum = 0;
    ledger.forEach(tx => {
      if (tx.type === 'fine') {
        if (tx.event.includes('Meeting')) meetingSum += tx.amount;
        else if (tx.event.includes('Major Event') || tx.event.includes('Assembly') || tx.event.includes('Sports') || tx.event.includes('Foundation')) majorSum += tx.amount;
        else specialSum += tx.amount;
      }
    });
    return [
      { label: 'Meetings', val: meetingSum },
      { label: 'Major Events', val: majorSum },
      { label: 'Special Events', val: specialSum }
    ];
  }, [ledger]);

  const handleTriggerAbsence = (e) => {
    e.preventDefault();
    if (!simMemberId) return;
    axios.post('/api/infraction', { memberId: simMemberId, eventType: simEventType, customEventName: simCustomEventName })
      .then(res => {
        setMembers(res.data.members);
        setLedger(res.data.ledger);
        setAuditLogs(res.data.auditLogs);
        setSelectedMemberId(simMemberId);
        setSimCustomEventName("");
        showToast("Assessed absence fine successfully");
        setActiveTab("ledger");
      })
      .catch(() => showToast("Failed to process infraction", "error"));
  };

  const handleProcessPaymentSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || !selectedMember) return;
    axios.post('/api/payment', { memberId: selectedMember.id, amount: amt, type: paymentType, reference: receiptRef })
      .then(res => {
        setMembers(res.data.members);
        setLedger(res.data.ledger);
        setAuditLogs(res.data.auditLogs);
        setPaymentModalOpen(false);
        setPaymentAmount("");
        setReceiptRef("");
        showToast("Payment recorded successfully");
      })
      .catch(err => showToast(err.response?.data?.error || "Payment failed", "error"));
  };

  const handleUpdateRules = (type, val) => {
    const parsedVal = parseInt(val) || 0;
    axios.post('/api/rules', { ...rules, [type]: parsedVal })
      .then(res => {
        setRules(res.data.rules);
        setAuditLogs(res.data.auditLogs);
        showToast("Rules updated successfully");
      })
      .catch(() => showToast("Failed to update rules", "error"));
  };

  return (
    <ThemeProvider theme={darkTheme}>
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
              backgroundColor: '#0f1222',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px 16px'
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: '#000', fontWeight: 800 }}>₱</Avatar>
            <Typography variant="h6" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SanctionPay
            </Typography>
          </Box>

          <List sx={{ flexGrow: 1 }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'simulator', label: 'Attendance Trigger', icon: '⚡' },
              { id: 'ledger', label: 'Member Ledger', icon: '📂' },
              { id: 'rules', label: 'Sanction Rules', icon: '⚙️' },
              { id: 'audit', label: 'Audit Trail', icon: '📜' },
            ].map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  selected={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  sx={{
                    borderRadius: '12px',
                    color: activeTab === item.id ? 'primary.main' : 'text.secondary',
                    '&.Mui-selected': { backgroundColor: 'rgba(0, 242, 254, 0.08)' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, fontSize: '1.25rem' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ border: '2px solid #4facfe' }}>AD</Avatar>
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
                  {activeTab === 'dashboard' && "Dashboard Overview"}
                  {activeTab === 'simulator' && "Attendance Trigger Simulator"}
                  {activeTab === 'ledger' && "Member Financial Ledger"}
                  {activeTab === 'rules' && "Sanction Policy & Rules"}
                  {activeTab === 'audit' && "Audit Ledger Trail"}
                </Typography>
              </Box>
              <Button variant="contained" color="primary" onClick={() => setActiveTab("simulator")} startIcon={<span>⚡</span>} sx={{ color: '#000' }}>
                Simulate Infraction
              </Button>
            </Toolbar>
          </AppBar>

          {notification.open && (
            <Alert severity={notification.severity} sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setNotification(prev => ({ ...prev, open: false }))}>
              {notification.message}
            </Alert>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard stats={stats} chartData={chartData} auditLogs={auditLogs} setActiveTab={setActiveTab} />
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
          {activeTab === 'audit' && (
            <AuditTrail auditLogs={auditLogs} />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
