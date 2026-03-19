const pool = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const calculatePayrollTotals = (data) => {
    const gross_earnings = (
        Number(data.basic_salary || 0) +
        Number(data.hra || 0) +
        Number(data.dearness_allowance || 0) +
        Number(data.conveyance_allowance || 0) +
        Number(data.medical_allowance || 0) +
        Number(data.special_allowance || 0) +
        Number(data.overtime || 0) +
        Number(data.bonus || 0) +
        Number(data.other_earnings || 0)
    );
    const total_deductions = (
        Number(data.epf_employee || 0) +
        Number(data.esi_employee || 0) +
        Number(data.professional_tax || 0) +
        Number(data.tds || 0) +
        Number(data.loan_recovery || 0) +
        Number(data.other_deductions || 0)
    );
    const net_salary = gross_earnings - total_deductions;
    return { gross_earnings, total_deductions, net_salary };
};

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
                const id = uuidv4();

                // Fetch active approved loans
                const [activeLoans] = await pool.execute(
                    'SELECT id, monthly_installment, total_repayable FROM loans WHERE user_id = ? AND status = "approved" AND repayment_start_date <= CURDATE()',
                    [emp.user_id]
                );

                let total_loan_recovery = 0;
                let loanRepaymentsToInsert = [];

                for (const loan of activeLoans) {
                    // Check how much is already paid
                    const [payments] = await pool.execute(
                        'SELECT SUM(amount) as total_paid FROM loan_repayments WHERE loan_id = ?',
                        [loan.id]
                    );
                    const total_paid = payments[0].total_paid || 0;
                    const remaining = loan.total_repayable - total_paid;

                    if (remaining > 0) {
                        const deduction = Math.min(loan.monthly_installment, remaining);
                        total_loan_recovery += deduction;
                        loanRepaymentsToInsert.push({
                            loan_id: loan.id,
                            amount: deduction,
                            isComplete: (remaining - deduction) <= 0.01 // Floating point safety
                        });
                    }
                }

                // Prepare data for calculation
                // Carry forward all components from previous month
                const dataToCalc = {
                    ...record,
                    loan_recovery: total_loan_recovery
                };
                const { gross_earnings, total_deductions, net_salary } = calculatePayrollTotals(dataToCalc);

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
                    record.overtime, record.bonus, record.other_earnings, record.epf_employee, record.esi_employee,
                    record.professional_tax, record.tds, total_loan_recovery, record.other_deductions,
                    gross_earnings, total_deductions, net_salary, record.paid_days, 0, 'Auto-generated'
                ]);

                // Record repayments and update loan status if complete
                for (const rep of loanRepaymentsToInsert) {
                    await pool.execute(
                        'INSERT INTO loan_repayments (id, loan_id, payroll_id, amount, payment_date, method) VALUES (?, ?, ?, ?, CURDATE(), "payroll_deduction")',
                        [uuidv4(), rep.loan_id, id, rep.amount]
                    );

                    if (rep.isComplete) {
                        await pool.execute('UPDATE loans SET status = "completed" WHERE id = ?', [rep.loan_id]);
                    }
                }

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
    const { gross_earnings, total_deductions, net_salary } = calculatePayrollTotals(data);

    // List of valid columns in 'payroll' table
    const validFields = [
        'user_id', 'month', 'basic_salary', 'hra', 'dearness_allowance',
        'conveyance_allowance', 'medical_allowance', 'special_allowance',
        'overtime', 'bonus', 'other_earnings', 'epf_employee', 'esi_employee',
        'professional_tax', 'tds', 'loan_recovery', 'other_deductions',
        'epf_employer', 'esi_employer', 'gross_earnings', 'total_deductions',
        'net_salary', 'paid_days', 'lop_days', 'notes', 'released'
    ];

    const fullData = {
        ...data,
        gross_earnings,
        total_deductions,
        net_salary
    };

    // Filter to only valid fields
    const filteredData = {};
    for (const field of validFields) {
        if (Object.prototype.hasOwnProperty.call(fullData, field)) {
            filteredData[field] = fullData[field];
        }
    }

    const id = uuidv4();
    const fields = ['id', ...Object.keys(filteredData)];
    const placeholders = fields.map(() => '?').join(', ');
    const params = [id, ...Object.values(filteredData)];

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

    const moneyFields = [
        'basic_salary', 'hra', 'dearness_allowance', 'conveyance_allowance',
        'medical_allowance', 'special_allowance', 'overtime', 'bonus',
        'other_earnings', 'epf_employee', 'esi_employee', 'professional_tax',
        'tds', 'loan_recovery', 'other_deductions'
    ];

    const hasMoneyUpdate = Object.keys(updates).some(k => moneyFields.includes(k));

    let finalUpdates = { ...updates };
    if (hasMoneyUpdate) {
        const { gross_earnings, total_deductions, net_salary } = calculatePayrollTotals(updates);
        finalUpdates.gross_earnings = gross_earnings;
        finalUpdates.total_deductions = total_deductions;
        finalUpdates.net_salary = net_salary;
    }

    // List of valid columns in 'payroll' table
    const validFields = [
        'user_id', 'month', 'basic_salary', 'hra', 'dearness_allowance',
        'conveyance_allowance', 'medical_allowance', 'special_allowance',
        'overtime', 'bonus', 'other_earnings', 'epf_employee', 'esi_employee',
        'professional_tax', 'tds', 'loan_recovery', 'other_deductions',
        'epf_employer', 'esi_employer', 'gross_earnings', 'total_deductions',
        'net_salary', 'paid_days', 'lop_days', 'notes', 'released'
    ];

    // Filter to only valid fields
    const filteredUpdates = {};
    for (const field of validFields) {
        if (Object.prototype.hasOwnProperty.call(finalUpdates, field)) {
            filteredUpdates[field] = finalUpdates[field];
        }
    }

    const fields = Object.keys(filteredUpdates);
    if (fields.length === 0) return res.status(400).json({ error: 'No valid fields provided' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const params = [...Object.values(filteredUpdates), id];

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

