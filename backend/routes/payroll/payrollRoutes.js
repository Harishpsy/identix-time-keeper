const express = require('express');
const {
    getPayroll,
    generatePayroll,
    createPayroll,
    updatePayroll,
    deletePayroll,
    releaseAllPayroll,
    calculateDays
} = require('../../controllers/payroll/payrollController');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getPayroll);
router.get('/calculate-days', authMiddleware, roleMiddleware(['admin']), calculateDays);
router.post('/', authMiddleware, roleMiddleware(['admin']), createPayroll);
router.patch('/:id', authMiddleware, roleMiddleware(['admin']), updatePayroll);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deletePayroll);
router.post('/generate', authMiddleware, roleMiddleware(['admin']), generatePayroll);
router.post('/release-all', authMiddleware, roleMiddleware(['admin']), releaseAllPayroll);

module.exports = router;
