const express = require('express');
const { getPayroll, generatePayroll } = require('../controllers/payrollController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getPayroll);
router.post('/generate', authMiddleware, roleMiddleware(['admin']), generatePayroll);

module.exports = router;
