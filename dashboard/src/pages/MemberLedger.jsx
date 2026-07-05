import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  TableContainer, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Paper, 
  Avatar, 
  Chip, 
  Alert, 
  Button, 
  Divider, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select 
} from '@mui/material';

function MemberLedger({
  members,
  ledger,
  selectedMemberId,
  setSelectedMemberId,
  searchQuery,
  setSearchQuery,
  paymentAmount,
  setPaymentAmount,
  paymentType,
  setPaymentType,
  receiptRef,
  setReceiptRef,
  paymentModalOpen,
  setPaymentModalOpen,
  handleProcessPaymentSubmit,
  STANDING_THRESHOLD,
  selectedMember,
  selectedMemberHistory
}) {
  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Grid container spacing={3}>
        
        {/* Left Side: Members Table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Members Ledger</Typography>
              
              <TextField
                fullWidth
                size="small"
                label="Search members, IDs, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TableContainer component={Paper} sx={{ flexGrow: 1, maxHeight: 450, backgroundColor: 'transparent', backgroundImage: 'none', border: '1px solid #eeeeee' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ backgroundColor: '#800000', color: '#ffffff' }}>Member</TableCell>
                      <TableCell style={{ backgroundColor: '#800000', color: '#ffffff' }}>Outstanding</TableCell>
                      <TableCell style={{ backgroundColor: '#800000', color: '#ffffff' }}>Standing</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow 
                        key={m.id}
                        hover
                        selected={selectedMemberId === m.id}
                        onClick={() => setSelectedMemberId(m.id)}
                        sx={{ 
                          cursor: 'pointer',
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(128, 0, 0, 0.05)',
                            borderLeft: '4px solid #800000'
                          }
                        }}
                      >
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
                        <TableCell sx={{ fontWeight: 700, color: m.balance > 0 ? 'error.main' : 'text.secondary' }}>
                          ₱{m.balance}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={m.standing === 'Good Standing' ? 'Good' : 'Flagged'} 
                            color={m.standing === 'Good Standing' ? 'success' : 'error'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {members.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No members found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Member Details Card */}
        <Grid item xs={12} md={5}>
          {selectedMember ? (
            <Card sx={{ border: '1px solid rgba(128, 0, 0, 0.2)', boxShadow: 'none' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h5">{selectedMember.name}</Typography>
                    <Typography variant="caption" color="text.secondary">ID: {selectedMember.id} | {selectedMember.email}</Typography>
                  </Box>
                  <Chip 
                    label={selectedMember.standing}
                    color={selectedMember.standing === 'Good Standing' ? 'success' : 'error'}
                  />
                </Box>

                {selectedMember.standing === 'Not in Good Standing' && (
                  <Alert severity="error" icon={<span>🚫</span>} sx={{ borderRadius: '10px' }}>
                    Account Restricted. Outstanding balance exceeds ₱{STANDING_THRESHOLD}. Restricted from clearance.
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #eeeeee', backgroundColor: '#fafafa' }}>
                      <Typography variant="caption" color="text.secondary">Outstanding Dues</Typography>
                      <Typography variant="h6" color={selectedMember.balance > 0 ? "error.main" : "inherit"}>
                        ₱{selectedMember.balance}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #eeeeee', backgroundColor: '#fafafa' }}>
                      <Typography variant="caption" color="text.secondary">Total Cleared Fines</Typography>
                      <Typography variant="h6" color="success.main">
                        ₱{selectedMember.totalPaid}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={selectedMember.balance === 0}
                  sx={{ color: '#fff', fontWeight: 'bold' }}
                >
                  💳 Log Sanction Payment
                </Button>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Transaction Ledger History</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                    {selectedMemberHistory.map(tx => (
                      <Box 
                        key={tx.id}
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          backgroundColor: '#fafafa',
                          border: '1px solid #eeeeee',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start'
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{tx.event}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tx.date} {tx.reference && ` | Ref: ${tx.reference}`}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          fontWeight={700}
                          color={tx.type === 'fine' ? 'error.main' : 'success.main'}
                        >
                          {tx.type === 'fine' ? `+₱${tx.amount}` : `-₱${tx.amount}`}
                        </Typography>
                      </Box>
                    ))}
                    {selectedMemberHistory.length === 0 && (
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', py: 3 }}>
                        Ledger clear. No transactions recorded.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, color: 'text.secondary' }}>
              <Box align="center">
                <Typography variant="h2">📂</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Select a member in the ledger view to inspect balance files and issue payments.</Typography>
              </Box>
            </Card>
          )}
        </Grid>

      </Grid>

      {/* Record Payment Dialog */}
      {paymentModalOpen && selectedMember && (
        <Dialog 
          open={paymentModalOpen} 
          onClose={() => setPaymentModalOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 4,
              width: 450,
              backgroundColor: '#ffffff',
              border: '1px solid #eeeeee'
            }
          }}
        >
          <form onSubmit={handleProcessPaymentSubmit}>
            <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>Record Payment</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
              
              <Box>
                <Typography variant="caption" color="text.secondary">Member</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedMember.name}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, border: '1px solid rgba(128, 0, 0, 0.15)', backgroundColor: 'rgba(128, 0, 0, 0.03)' }}>
                <Typography variant="body2" color="text.secondary">Outstanding Dues:</Typography>
                <Typography variant="body1" color="error.main" fontWeight={700}>₱{selectedMember.balance}</Typography>
              </Box>

              <TextField 
                fullWidth
                type="number"
                label="Payment Amount (₱)"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                inputProps={{ min: 1, max: selectedMember.balance, step: "any" }}
                error={Boolean(paymentAmount && (parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > selectedMember.balance))}
                helperText={
                  paymentAmount && parseFloat(paymentAmount) > selectedMember.balance 
                    ? `Cannot exceed outstanding balance of ₱${selectedMember.balance}`
                    : paymentAmount && parseFloat(paymentAmount) <= 0
                    ? "Amount must be a positive value"
                    : ""
                }
                required
              />

              <FormControl fullWidth>
                <InputLabel id="payment-mode-label">Payment Mode</InputLabel>
                <Select
                  labelId="payment-mode-label"
                  value={paymentType}
                  label="Payment Mode"
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option value="cash">Cash (Manual Invoice)</option>
                  <option value="receipt">Digital Receipt Logging (G-Cash/Bank)</option>
                </Select>
              </FormControl>

              {paymentType === 'receipt' && (
                <TextField 
                  fullWidth
                  label="Transaction Reference Code"
                  placeholder="e.g. REF-12984920"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  error={Boolean(paymentType === 'receipt' && receiptRef && receiptRef.trim().length < 5)}
                  helperText={
                    paymentType === 'receipt' && receiptRef && receiptRef.trim().length < 5
                      ? "Reference code must be at least 5 characters long"
                      : ""
                  }
                  required
                />
              )}

            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setPaymentModalOpen(false)} color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" color="primary" sx={{ color: '#fff' }}>Confirm Payment</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </Box>
  );
}

export default MemberLedger;
