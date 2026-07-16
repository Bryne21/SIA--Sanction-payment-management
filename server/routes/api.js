const express = require('express');
const {
  handleGetState,
  handleProcessAttendance
} = require('../controllers/sanctionController');

const router = express.Router();

router.get('/state', handleGetState);
router.post('/attendance/process', handleProcessAttendance);

module.exports = router;
