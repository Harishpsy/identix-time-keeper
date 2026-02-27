const express = require('express');
const {
    getLeaveRequests,
    applyLeave,
    updateLeaveStatus,
    getLeaveBalances,
    getAllLeaveBalances,
    updateEmployeeBalance,
    syncAllBalances
} = require('../../controllers/management/leaveController');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getLeaveRequests);
router.post('/apply', authMiddleware, applyLeave);
router.get('/balances', authMiddleware, getLeaveBalances);
router.get('/balances/all', authMiddleware, roleMiddleware(['admin', 'subadmin']), getAllLeaveBalances);
router.post('/balances/update', authMiddleware, roleMiddleware(['admin', 'subadmin']), updateEmployeeBalance);
router.post('/balances/sync', authMiddleware, roleMiddleware(['admin']), syncAllBalances);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'subadmin']), updateLeaveStatus);

module.exports = router;
