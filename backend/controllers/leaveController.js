const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const getLeaveRequests = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query = `
            SELECT lr.*, p.full_name, r.role as requester_role 
            FROM leave_requests lr 
            JOIN profiles p ON lr.user_id = p.id
            JOIN user_roles r ON lr.user_id = r.user_id
        `;
        let params = [];

        if (role === 'employee') {
            query += ' WHERE lr.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY lr.created_at DESC';
        const [requests] = await pool.execute(query, params);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const applyLeave = async (req, res) => {
    const { date, type, reason, start_time, end_time } = req.body;
    const userId = req.user.id;

    if (!date || !type) {
        return res.status(400).json({ error: 'Date and type are required' });
    }

    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO leave_requests (id, user_id, date, type, reason, status, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userId, date, type, reason || '', 'pending', start_time || null, end_time || null]
        );
        res.status(201).json({ success: true, id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateLeaveStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Fetch request and requester role
            const [requests] = await connection.execute(
                `SELECT lr.*, r.role as requester_role 
                 FROM leave_requests lr 
                 JOIN user_roles r ON lr.user_id = r.user_id 
                 WHERE lr.id = ?`,
                [id]
            );

            if (requests.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Leave request not found' });
            }

            const request = requests[0];

            // 1. Prevent self-approval
            if (request.user_id === adminId) {
                await connection.rollback();
                connection.release();
                return res.status(403).json({ error: 'You cannot approve your own leave requests' });
            }

            // 2. Hierarchy validation
            const approverRole = req.user.role;
            const requesterRole = request.requester_role;

            const roleHierarchy = { 'super_admin': 4, 'admin': 3, 'subadmin': 2, 'employee': 1 };
            if (roleHierarchy[approverRole] <= roleHierarchy[requesterRole]) {
                await connection.rollback();
                connection.release();
                return res.status(403).json({ error: 'Insufficient permissions to approve this request based on hierarchy' });
            }

            const oldStatus = request.status;

            await connection.execute(
                'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
                [status, status === 'approved' ? adminId : null, status === 'approved' ? new Date() : null, id]
            );

            // Handle leave balance updates
            if (status === 'approved' && oldStatus !== 'approved') {
                const year = new Date(request.date).getFullYear();

                if (request.type === 'half_day') {
                    // Half day: update daily_summaries status to 'half_day', no balance deduction
                    const dateStr = new Date(request.date).toISOString().split('T')[0];
                    const [existing] = await connection.execute(
                        'SELECT id FROM daily_summaries WHERE user_id = ? AND date = ?',
                        [request.user_id, dateStr]
                    );
                    if (existing.length > 0) {
                        await connection.execute(
                            'UPDATE daily_summaries SET status = ? WHERE user_id = ? AND date = ?',
                            ['half_day', request.user_id, dateStr]
                        );
                    }
                } else {
                    const typeColumn = `${request.type}_used`;

                    let amount = 1;
                    if (request.type === 'permission' && request.start_time && request.end_time) {
                        // Calculate hours between start_time and end_time
                        const start = new Date(`1970-01-01T${request.start_time}`);
                        const end = new Date(`1970-01-01T${request.end_time}`);
                        const diffMs = end - start;
                        amount = Math.max(0, diffMs / (1000 * 60 * 60));
                    }

                    // Ensure balance exists, use company defaults if it doesn't
                    const [balances] = await connection.execute(
                        'SELECT id FROM leave_balances WHERE user_id = ? AND year = ?',
                        [request.user_id, year]
                    );

                    if (balances.length === 0) {
                        const [settings] = await connection.execute('SELECT default_sick_leaves, default_casual_leaves, default_annual_leaves, default_permission_leaves FROM company_settings LIMIT 1');
                        const s = settings[0] || { default_sick_leaves: 12, default_casual_leaves: 12, default_annual_leaves: 15, default_permission_leaves: 0 };

                        await connection.execute(
                            'INSERT INTO leave_balances (id, user_id, year, sick_total, casual_total, annual_total, permission_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [uuidv4(), request.user_id, year, s.default_sick_leaves, s.default_casual_leaves, s.default_annual_leaves, s.default_permission_leaves]
                        );
                    }

                    await connection.execute(
                        `UPDATE leave_balances SET ${typeColumn} = ${typeColumn} + ? WHERE user_id = ? AND year = ?`,
                        [amount, request.user_id, year]
                    );
                }
            }

            await connection.commit();
            res.json({ success: true });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getLeaveBalances = async (req, res) => {
    const userId = req.user.id;
    const year = new Date().getFullYear();

    try {
        const [balances] = await pool.execute(
            'SELECT * FROM leave_balances WHERE user_id = ? AND year = ?',
            [userId, year]
        );

        if (balances.length > 0) {
            return res.json(balances[0]);
        }

        // Fallback to company settings if no balance record exists
        const [settings] = await pool.execute('SELECT default_sick_leaves, default_casual_leaves, default_annual_leaves, default_permission_leaves FROM company_settings LIMIT 1');
        const s = settings[0] || { default_sick_leaves: 12, default_casual_leaves: 12, default_annual_leaves: 15, default_permission_leaves: 0 };

        res.json({
            user_id: userId,
            year,
            sick_total: s.default_sick_leaves,
            sick_used: 0,
            casual_total: s.default_casual_leaves,
            casual_used: 0,
            annual_total: s.default_annual_leaves,
            annual_used: 0,
            permission_total: s.default_permission_leaves,
            permission_used: 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAllLeaveBalances = async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const [balances] = await pool.execute(
            `SELECT DISTINCT lb.*, p.full_name 
             FROM leave_balances lb 
             JOIN profiles p ON lb.user_id = p.id 
             WHERE lb.year = ? 
             ORDER BY p.full_name ASC`,
            [year]
        );
        res.json(balances);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateEmployeeBalance = async (req, res) => {
    const { userId, year, sick_total, casual_total, annual_total, permission_total } = req.body;

    if (!userId || !year) {
        return res.status(400).json({ error: 'User ID and year are required' });
    }

    try {
        await pool.execute(
            `INSERT INTO leave_balances (id, user_id, year, sick_total, casual_total, annual_total, permission_total) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             sick_total = VALUES(sick_total), 
             casual_total = VALUES(casual_total), 
             annual_total = VALUES(annual_total),
             permission_total = VALUES(permission_total)`,
            [uuidv4(), userId, year, sick_total || 12, casual_total || 12, annual_total || 15, permission_total || 0]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const syncAllBalances = async (req, res) => {
    const year = new Date().getFullYear();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [settings] = await connection.execute('SELECT default_sick_leaves, default_casual_leaves, default_annual_leaves, default_permission_leaves FROM company_settings LIMIT 1');
        const s = settings[0] || { default_sick_leaves: 12, default_casual_leaves: 12, default_annual_leaves: 15, default_permission_leaves: 0 };

        // 1. Update existing balances for the current year
        await connection.execute(
            `UPDATE leave_balances 
             SET sick_total = ?, casual_total = ?, annual_total = ?, permission_total = ? 
             WHERE year = ?`,
            [s.default_sick_leaves, s.default_casual_leaves, s.default_annual_leaves, s.default_permission_leaves, year]
        );

        // 2. Initialize missing balances for existing active employees
        const [employees] = await connection.execute(
            `SELECT p.id FROM profiles p 
             LEFT JOIN leave_balances lb ON p.id = lb.user_id AND lb.year = ?
             WHERE p.is_active = true AND lb.id IS NULL`,
            [year]
        );

        for (const emp of employees) {
            await connection.execute(
                'INSERT INTO leave_balances (id, user_id, year, sick_total, casual_total, annual_total, permission_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), emp.id, year, s.default_sick_leaves, s.default_casual_leaves, s.default_annual_leaves, s.default_permission_leaves]
            );
        }

        await connection.commit();
        res.json({ success: true, initializedCount: employees.length });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getLeaveRequests,
    applyLeave,
    updateLeaveStatus,
    getLeaveBalances,
    getAllLeaveBalances,
    updateEmployeeBalance,
    syncAllBalances
};
