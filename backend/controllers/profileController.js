const pool = require('../config/db');

const getProfiles = async (req, res) => {
    try {
        const [profiles] = await pool.execute(
            'SELECT p.*, d.name as department_name, s.name as shift_name FROM profiles p ' +
            'LEFT JOIN departments d ON p.department_id = d.id ' +
            'LEFT JOIN shifts s ON p.shift_id = s.id'
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

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const params = [...Object.values(updates), id];

    try {
        await pool.execute(`UPDATE profiles SET ${setClause} WHERE id = ?`, params);
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
    try {
        const [result] = await pool.execute('INSERT INTO departments (name) VALUES (?)', [name]);
        res.json({ id: result.insertId, name });
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
    try {
        const [result] = await pool.execute(
            'INSERT INTO shifts (name, start_time, end_time, grace_period_mins, total_working_hours, max_break_minutes) VALUES (?, ?, ?, ?, ?, ?)',
            [shift.name, shift.start_time, shift.end_time, shift.grace_period_mins, shift.total_working_hours, shift.max_break_minutes]
        );
        res.json({ id: result.insertId, ...shift });
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
    try {
        await pool.execute('DELETE FROM shifts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
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

module.exports = { getProfiles, getProfileById, updateProfile, getDepartments, createDepartment, updateDepartment, deleteDepartment, getShifts, createShift, updateShift, deleteShift, getShiftById };
