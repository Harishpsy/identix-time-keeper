const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const getLeaveRequests = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query = 'SELECT lr.*, p.full_name FROM leave_requests lr JOIN profiles p ON lr.user_id = p.id';
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
    const { date, type, reason } = req.body;
    const userId = req.user.id;

    if (!date || !type) {
        return res.status(400).json({ error: 'Date and type are required' });
    }

    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO leave_requests (id, user_id, date, type, reason, status) VALUES (?, ?, ?, ?, ?, ?)',
            [id, userId, date, type, reason || '', 'pending']
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

            const [requests] = await connection.execute('SELECT * FROM leave_requests WHERE id = ?', [id]);
            if (requests.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Leave request not found' });
            }

            const request = requests[0];
            const oldStatus = request.status;

            await connection.execute(
                'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
                [status, status === 'approved' ? adminId : null, status === 'approved' ? new Date() : null, id]
            );

            // Handle leave balance updates
            if (status === 'approved' && oldStatus !== 'approved') {
                const year = new Date(request.date).getFullYear();
                const typeColumn = `${request.type}_used`;

                // Ensure balance exists
                await connection.execute(
                    'INSERT IGNORE INTO leave_balances (id, user_id, year) VALUES (?, ?, ?)',
                    [uuidv4(), request.user_id, year]
                );

                await connection.execute(
                    `UPDATE leave_balances SET ${typeColumn} = ${typeColumn} + 1 WHERE user_id = ? AND year = ?`,
                    [request.user_id, year]
                );
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
        res.json(balances[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getLeaveRequests, applyLeave, updateLeaveStatus, getLeaveBalances };
