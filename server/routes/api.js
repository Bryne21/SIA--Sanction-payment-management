const express = require('express');
const {
  handleGetState,
  handleLogInfraction,
  handleProcessPayment,
  handleUpdateRules,
  handleProcessAttendance
} = require('../controllers/sanctionController');

const router = express.Router();

router.get('/state', handleGetState);
router.post('/infraction', handleLogInfraction);
router.post('/payment', handleProcessPayment);
router.post('/rules', handleUpdateRules);
router.post('/attendance/process', handleProcessAttendance);

module.exports = router;
