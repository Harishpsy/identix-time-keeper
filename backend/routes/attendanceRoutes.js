const express = require('express');
const { logPunch, getSummary, reprocessSummaries, getRecentPunches, deletePunches, getMyPunches } = require('../controllers/attendanceController');
const { handleADMS } = require('../controllers/iclockController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Biometric device (ADMS) routes - No auth middleware needed as devices use SN
router.all('/iclock/cdata', handleADMS);

// Manual punch
router.post('/punch', authMiddleware, logPunch);

// Summaries
router.get('/my-punches', authMiddleware, getMyPunches);
router.get('/summary', authMiddleware, getSummary);
router.get('/recent', authMiddleware, roleMiddleware(['admin', 'subadmin']), getRecentPunches);
router.post('/delete-punches', authMiddleware, roleMiddleware(['admin']), deletePunches);
router.post('/reprocess', authMiddleware, roleMiddleware(['admin']), reprocessSummaries);

module.exports = router;
