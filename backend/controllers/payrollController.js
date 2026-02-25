const pool = require('../config/db');

const getPayroll = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { month } = req.query;

    try {
        let query = 'SELECT * FROM payroll WHERE 1=1';
        let params = [];

        if (role === 'employee') {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        if (month) {
            query += ' AND month = ?';
            params.push(month);
        }

        query += ' ORDER BY month DESC';
        const [records] = await pool.execute(query, params);
        res.json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const uuid = require('uuid');

const generatePayroll = async (req, res) => {
    const { month } = req.body;
    try {
        // Find employees who don't have payroll for this month
        const [missing] = await pool.execute(`
            SELECT p.id as user_id FROM profiles p 
            WHERE p.is_active = true 
            AND p.id NOT IN (SELECT user_id FROM payroll WHERE month = ?)
        `, [month]);

        let createdCount = 0;
        let skippedCount = 0;

        for (const emp of missing) {
            const [prev] = await pool.execute(
                'SELECT * FROM payroll WHERE user_id = ? ORDER BY month DESC LIMIT 1',
                [emp.user_id]
            );

            if (prev.length > 0) {
                const record = prev[0];
                const id = uuid.v4();

                // Fetch active loan repayment for this month if exists
                const [activeLoans] = await pool.execute(
                    'SELECT SUM(monthly_installment) as total_installment FROM loans WHERE user_id = ? AND status = "approved" AND repayment_start_date <= CURDATE()',
                    [emp.user_id]
                );
                const loan_recovery = activeLoans[0].total_installment || 0;

                await pool.execute(`
                    INSERT INTO payroll (
                        id, user_id, month, basic_salary, hra, dearness_allowance, 
                        conveyance_allowance, medical_allowance, special_allowance, 
                        overtime, bonus, other_earnings, epf_employee, esi_employee, 
                        professional_tax, tds, loan_recovery, other_deductions, 
                        gross_earnings, total_deductions, net_salary, paid_days, 
                        lop_days, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id, emp.user_id, month, record.basic_salary, record.hra, record.dearness_allowance,
                    record.conveyance_allowance, record.medical_allowance, record.special_allowance,
                    0, 0, 0, record.epf_employee, record.esi_employee,
                    record.professional_tax, record.tds, loan_recovery, record.other_deductions,
                    record.gross_earnings, record.total_deductions + (loan_recovery - record.loan_recovery),
                    record.net_salary - (loan_recovery - record.loan_recovery),
                    record.paid_days, 0, 'Auto-generated'
                ]);
                createdCount++;
            } else {
                skippedCount++;
            }
        }
        res.json({ message: `Generated ${createdCount} payroll records. ${skippedCount} skipped.`, createdCount, skippedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createPayroll = async (req, res) => {
    const data = req.body;
    const id = uuid.v4();
    const fields = ['id', ...Object.keys(data)];
    const placeholders = fields.map(() => '?').join(', ');
    const params = [id, ...Object.values(data)];

    try {
        await pool.execute(`INSERT INTO payroll (${fields.join(', ')}) VALUES (${placeholders})`, params);
        res.status(201).json({ id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Entry already exists' });
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePayroll = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    const fields = Object.keys(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const params = [...Object.values(updates), id];

    try {
        await pool.execute(`UPDATE payroll SET ${setClause} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deletePayroll = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM payroll WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const releaseAllPayroll = async (req, res) => {
    const { month } = req.body;
    try {
        await pool.execute('UPDATE payroll SET released = true WHERE month = ? AND released = false', [month]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getPayroll, generatePayroll, createPayroll, updatePayroll, deletePayroll, releaseAllPayroll };
