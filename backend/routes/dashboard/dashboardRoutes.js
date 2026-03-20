const express = require('express');
const { getAdminStats, getTodayLeave, getAnniversaries, getBirthdays, getEmployeeDashboard } = require('../../controllers/dashboard/dashboardController');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/admin/stats', authMiddleware, roleMiddleware(['admin', 'subadmin']), getAdminStats);
router.get('/admin/leave', authMiddleware, roleMiddleware(['admin', 'subadmin']), getTodayLeave);
router.get('/anniversaries', authMiddleware, getAnniversaries);
router.get('/birthdays', authMiddleware, getBirthdays);
router.get('/employee', authMiddleware, getEmployeeDashboard);

module.exports = router;
