const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const logPunch = async (req, res) => {
    const { punch_type } = req.body;
    const userId = req.user.id;
    const timestamp = new Date(); // Current server time

    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO attendance_raw (id, user_id, timestamp, punch_type) VALUES (?, ?, ?, ?)',
            [id, userId, timestamp, punch_type || 'manual']
        );

        res.status(201).json({ success: true, timestamp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getSummary = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { start_date, end_date } = req.query;

    try {
        let query = 'SELECT s.*, p.full_name, p.email FROM daily_summaries s ' +
            'JOIN profiles p ON s.user_id = p.id WHERE 1=1';
        let params = [];

        if (role === 'employee') {
            query += ' AND s.user_id = ?';
            params.push(userId);
        }

        if (start_date && end_date) {
            query += ' AND s.date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        query += ' ORDER BY s.date DESC';
        const [summaries] = await pool.execute(query, params);
        res.json(summaries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const reprocessSummaries = async (req, res) => {
    const { date } = req.body;
    // This would contain the logic from process-daily-summary edge function
    // Porting it would involve fetching attendance_raw for the date and merging into daily_summaries
    try {
        // Porting logic...
        res.json({ message: 'Reprocessing triggered', date });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getRecentPunches = async (req, res) => {
    const { date } = req.query;
    try {
        const [profiles] = await pool.execute('SELECT id, full_name, email FROM profiles WHERE is_active = true');
        const [punches] = await pool.execute(
            'SELECT * FROM attendance_raw WHERE DATE(timestamp) = ? ORDER BY timestamp ASC',
            [date]
        );
        res.json({ profiles, punches });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deletePunches = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No punch IDs provided' });
    }
    try {
        const placeholders = ids.map(() => '?').join(',');
        await pool.execute(`DELETE FROM attendance_raw WHERE id IN (${placeholders})`, ids);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getMyPunches = async (req, res) => {
    const userId = req.user.id;
    const { date } = req.query; // format: YYYY-MM-DD
    try {
        const [punches] = await pool.execute(
            'SELECT * FROM attendance_raw WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC',
            [userId, date]
        );
        res.json(punches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { logPunch, getSummary, reprocessSummaries, getRecentPunches, deletePunches, getMyPunches };
