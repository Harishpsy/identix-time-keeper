const pool = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const getLoans = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query = `
            SELECT l.*, p.full_name as employee_name, a.full_name as approved_by_name,
            (SELECT COALESCE(SUM(amount), 0) FROM loan_repayments WHERE loan_id = l.id) as total_paid
            FROM loans l
            JOIN profiles p ON l.user_id = p.id
            LEFT JOIN profiles a ON l.approved_by = a.id
        `;
        let params = [];

        if (role === 'employee') {
            query += ' WHERE l.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY l.created_at DESC';
        const [loans] = await pool.execute(query, params);
        res.json(loans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createLoan = async (req, res) => {
    const { amount, term_months, purpose, targetUserId } = req.body;
    const requesterId = req.user.id;
    const role = req.user.role;
    const id = uuidv4();

    // If admin provides a targetUserId, use it. Otherwise use the requester's ID.
    const userId = (role === 'admin' && targetUserId) ? targetUserId : requesterId;

    // Default calculations (can be refined by admin during approval or set directly)
    const interest_rate = 0;
    const total_repayable = parseFloat(amount);
    const monthly_installment = total_repayable / term_months;

    try {
        // Eligibility check for employees
        if (role !== 'admin') {
            const [profile] = await pool.execute('SELECT date_of_joining FROM profiles WHERE id = ?', [userId]);
            if (!profile[0] || !profile[0].date_of_joining) {
                return res.status(403).json({ error: 'Employment details not found. Please contact Admin.' });
            }

            const joiningDate = new Date(profile[0].date_of_joining);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            if (joiningDate > oneYearAgo) {
                return res.status(403).json({ error: 'You need at least 1 year of service to apply for a loan. Please contact Hr or Admin.' });
            }
        }

        await pool.execute(`
            INSERT INTO loans (
                id, user_id, amount, interest_rate, term_months, 
                monthly_installment, total_repayable, purpose, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, userId, amount, interest_rate, term_months, monthly_installment, total_repayable, purpose, 'pending']);

        res.status(201).json({ id, message: 'Loan created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateLoanStatus = async (req, res) => {
    const { id } = req.params;
    const { status, interest_rate, repayment_start_date } = req.body;
    const adminId = req.user.id;

    try {
        if (status === 'approved') {
            // Recalculate if interest rate is provided
            const [loanRecord] = await pool.execute('SELECT amount, term_months FROM loans WHERE id = ?', [id]);
            if (loanRecord.length === 0) return res.status(404).json({ error: 'Loan not found' });

            const amount = parseFloat(loanRecord[0].amount);
            const term_months = parseInt(loanRecord[0].term_months);
            const rate = interest_rate ? parseFloat(interest_rate) : 0;

            const total_repayable = amount + (amount * (rate / 100));
            const monthly_installment = total_repayable / term_months;

            await pool.execute(`
                UPDATE loans 
                SET status = ?, interest_rate = ?, total_repayable = ?, 
                    monthly_installment = ?, repayment_start_date = ?, 
                    approved_by = ?, approved_at = NOW()
                WHERE id = ?
            `, [status, rate, total_repayable, monthly_installment, repayment_start_date, adminId, id]);
        } else {
            await pool.execute(`
                UPDATE loans 
                SET status = ?, approved_by = ?, approved_at = NOW()
                WHERE id = ?
            `, [status, adminId, id]);
        }

        res.json({ success: true, message: `Loan ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getLoans, createLoan, updateLoanStatus };

