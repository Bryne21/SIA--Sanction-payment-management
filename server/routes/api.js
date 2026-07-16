const express = require('express');
const {
  handleGetState,
  handleLogInfraction,
  handleProcessAttendance
} = require('../controllers/sanctionController');

const router = express.Router();

router.get('/state', handleGetState);
router.post('/infraction', handleLogInfraction);
router.post('/attendance/process', handleProcessAttendance);

module.exports = router;
