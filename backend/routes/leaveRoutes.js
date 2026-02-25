const express = require('express');
const {
    getLeaveRequests,
    applyLeave,
    updateLeaveStatus,
    getLeaveBalances
} = require('../controllers/leaveController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getLeaveRequests);
router.post('/apply', authMiddleware, applyLeave);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'subadmin']), updateLeaveStatus);
router.get('/balances', authMiddleware, getLeaveBalances);

module.exports = router;
