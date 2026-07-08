const express = require('express');
const {
  handleGetState,
  handleLogInfraction,
  handleProcessPayment,
  handleUpdateRules
} = require('../controllers/sanctionController');

const router = express.Router();

router.get('/state', handleGetState);
router.post('/infraction', handleLogInfraction);
router.post('/payment', handleProcessPayment);
router.post('/rules', handleUpdateRules);

module.exports = router;
