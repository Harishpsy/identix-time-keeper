const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getProfiles = async (req, res) => {
    try {
        const [profiles] = await pool.execute(
            'SELECT p.*, r.role, d.name as department_name, s.name as shift_name, pm.full_name as manager_name ' +
            'FROM profiles p ' +
            'LEFT JOIN user_roles r ON p.id = r.user_id ' +
            'LEFT JOIN departments d ON p.department_id = d.id ' +
            'LEFT JOIN shifts s ON p.shift_id = s.id ' +
            'LEFT JOIN profiles pm ON p.manager_id = pm.id ' +
            "WHERE r.role != 'super_admin' OR r.role IS NULL"
        );
        res.json(profiles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfileById = async (req, res) => {
    const { id } = req.params;
    try {
        const [profiles] = await pool.execute('SELECT * FROM profiles WHERE id = ?', [id]);
        if (profiles.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(profiles[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.email;

    // Handle role update separately (stored in user_roles table)
    const role = updates.role;
    delete updates.role;

    try {
        // Update profile fields if any
        const fields = Object.keys(updates);
        if (fields.length > 0) {
            // Convert empty strings to null for date/nullable fields
            for (const key of fields) {
                if (updates[key] === '') {
                    updates[key] = null;
                }
            }
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const params = [...Object.values(updates), id];
            await pool.execute(`UPDATE profiles SET ${setClause} WHERE id = ?`, params);
        }

        // Update role if provided
        if (role) {
            await pool.execute('UPDATE user_roles SET role = ? WHERE user_id = ?', [role, id]);
        }

        if (fields.length === 0 && !role) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getDepartments = async (req, res) => {
    try {
        const [departments] = await pool.execute('SELECT * FROM departments');
        res.json(departments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createDepartment = async (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    try {
        await pool.execute('INSERT INTO departments (id, name) VALUES (?, ?)', [id, name]);
        res.json({ id, name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await pool.execute('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteDepartment = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM departments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getShifts = async (req, res) => {
    try {
        const [shifts] = await pool.execute('SELECT * FROM shifts');
        res.json(shifts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createShift = async (req, res) => {
    const shift = req.body;
    const id = uuidv4();
    try {
        await pool.execute(
            'INSERT INTO shifts (id, name, start_time, end_time, grace_period_mins, total_working_hours, max_break_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, shift.name, shift.start_time, shift.end_time, shift.grace_period_mins, shift.total_working_hours, shift.max_break_minutes]
        );
        res.json({ id, ...shift });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateShift = async (req, res) => {
    const { id } = req.params;
    const shift = req.body;
    try {
        await pool.execute(
            'UPDATE shifts SET name = ?, start_time = ?, end_time = ?, grace_period_mins = ?, total_working_hours = ?, max_break_minutes = ? WHERE id = ?',
            [shift.name, shift.start_time, shift.end_time, shift.grace_period_mins, shift.total_working_hours, shift.max_break_minutes, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteShift = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Unassign the shift from all profiles
        await connection.execute('UPDATE profiles SET shift_id = NULL WHERE shift_id = ?', [id]);

        // 2. Delete the shift
        await connection.execute('DELETE FROM shifts WHERE id = ?', [id]);

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

const getShiftById = async (req, res) => {
    const { id } = req.params;
    try {
        const [shifts] = await pool.execute('SELECT * FROM shifts WHERE id = ?', [id]);
        if (shifts.length === 0) return res.status(404).json({ error: 'Shift not found' });
        res.json(shifts[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteProfile = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        // Prevent deleting super_admin accounts. Admins can only be deleted by super_admin.
        const [roles] = await connection.execute('SELECT role FROM user_roles WHERE user_id = ?', [id]);
        const targetRole = roles.length > 0 ? roles[0].role : 'employee';

        if (targetRole === 'super_admin') {
            connection.release();
            return res.status(403).json({ error: 'Cannot delete Super Admin accounts' });
        }

        if (targetRole === 'admin' && req.user.role !== 'super_admin') {
            connection.release();
            return res.status(403).json({ error: 'Only Super Admin can delete admin accounts' });
        }

        await connection.beginTransaction();

        // Delete related data in order (foreign key dependencies)
        await connection.execute('DELETE FROM attendance_raw WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM daily_summaries WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM leave_requests WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM leave_balances WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM profiles WHERE id = ?', [id]);
        await connection.execute('DELETE FROM users WHERE id = ?', [id]);

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

const updateTheme = async (req, res) => {
    const { theme } = req.body;
    const { id } = req.user;

    if (!['light', 'dark'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme' });
    }

    try {
        await pool.execute('UPDATE profiles SET theme = ? WHERE id = ?', [theme, id]);
        res.json({ success: true, theme });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getProfiles, getProfileById, updateProfile, deleteProfile, getDepartments, createDepartment, updateDepartment, deleteDepartment, getShifts, createShift, updateShift, deleteShift, getShiftById, updateTheme };
