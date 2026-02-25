const express = require('express');
const { getLoans, createLoan, updateLoanStatus } = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getLoans);
router.post('/', authMiddleware, createLoan);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin']), updateLoanStatus);

module.exports = router;
