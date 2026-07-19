const express = require('express');
const {
  handleGetState,
  handleUpdateSanctionPaymentStatus,
  handleProcessAttendance
} = require('../controllers/sanctionController');

const router = express.Router();

router.get('/state', handleGetState);
router.patch('/sanctions/:id/payment-status', handleUpdateSanctionPaymentStatus);
router.post('/attendance/process', handleProcessAttendance);

module.exports = router;
