const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

// Helper: process daily summary for a user on a given date
const processDailySummary = async (userId, date) => {
    // Get all punches for this user on this date
    const [punches] = await pool.execute(
        'SELECT * FROM attendance_raw WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC',
        [userId, date]
    );

    if (punches.length === 0) return;

    const firstIn = punches[0].timestamp;
    const lastOut = punches.length > 1 ? punches[punches.length - 1].timestamp : null;

    // Calculate duration in minutes
    let totalDurationMinutes = null;
    if (firstIn && lastOut) {
        const diffMs = new Date(lastOut) - new Date(firstIn);
        totalDurationMinutes = Math.floor(diffMs / 60000);
    }

    // Get user's shift to calculate late minutes
    let lateMinutes = 0;
    let status = 'present';
    const [profiles] = await pool.execute('SELECT shift_id FROM profiles WHERE id = ?', [userId]);
    if (profiles.length > 0 && profiles[0].shift_id) {
        const [shifts] = await pool.execute('SELECT * FROM shifts WHERE id = ?', [profiles[0].shift_id]);
        if (shifts.length > 0) {
            const shift = shifts[0];
            // Compare first_in time with shift start_time + grace_period
            const firstInDate = new Date(firstIn);
            const [shiftHour, shiftMin] = shift.start_time.split(':').map(Number);
            const shiftStart = new Date(firstInDate);
            shiftStart.setHours(shiftHour, shiftMin + (shift.grace_period_mins || 0), 0, 0);

            if (firstInDate > shiftStart) {
                lateMinutes = Math.floor((firstInDate - shiftStart) / 60000);
                status = 'late';
            }
        }
    }

    // Check for approved half_day or on_leave requests — override status if found
    const [approvedLeaves] = await pool.execute(
        "SELECT type FROM leave_requests WHERE user_id = ? AND date = ? AND status = 'approved' AND type IN ('half_day') LIMIT 1",
        [userId, date]
    );
    if (approvedLeaves.length > 0) {
        status = approvedLeaves[0].type;
    }

    // Check if summary already exists
    const [existing] = await pool.execute(
        'SELECT id FROM daily_summaries WHERE user_id = ? AND date = ?',
        [userId, date]
    );

    if (existing.length > 0) {
        // Update existing
        await pool.execute(
            'UPDATE daily_summaries SET first_in = ?, last_out = ?, total_duration_minutes = ?, late_minutes = ?, status = ? WHERE id = ?',
            [firstIn, lastOut, totalDurationMinutes, lateMinutes, status, existing[0].id]
        );
    } else {
        // Insert new
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO daily_summaries (id, user_id, date, first_in, last_out, total_duration_minutes, late_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userId, date, firstIn, lastOut, totalDurationMinutes, lateMinutes, status]
        );
    }
};

const logPunch = async (req, res) => {
    const { punch_type } = req.body;
    const userId = req.user.id;
    const timestamp = new Date(); // Current server time
    const today = timestamp.toISOString().split('T')[0]; // yyyy-MM-dd

    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO attendance_raw (id, user_id, timestamp, punch_type) VALUES (?, ?, ?, ?)',
            [id, userId, timestamp, punch_type || 'manual']
        );

        // Auto-process daily summary after each punch
        await processDailySummary(userId, today);

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

        // For admin/subadmin: also include active employees who have NO daily_summaries record
        if (role !== 'employee' && start_date && end_date) {
            const [activeProfiles] = await pool.execute(
                'SELECT id, full_name, email, date_of_joining, created_at FROM profiles WHERE is_active = true'
            );

            // Helper: format Date to YYYY-MM-DD using local time (not UTC)
            const toLocalDateStr = (d) => {
                if (d instanceof Date) {
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
                return String(d).split('T')[0];
            };

            // Build a set of existing user_id+date combos
            const existingKeys = new Set(
                summaries.map(s => `${s.user_id}_${toLocalDateStr(s.date)}`)
            );

            // Generate dates in range
            const dates = [];
            const current = new Date(start_date + 'T00:00:00');
            const endDt = new Date(end_date + 'T00:00:00');
            const today = toLocalDateStr(new Date());
            while (current <= endDt) {
                const dateStr = toLocalDateStr(current);
                if (dateStr <= today) dates.push(dateStr);
                current.setDate(current.getDate() + 1);
            }

            // Add absent records for missing combinations
            for (const profile of activeProfiles) {
                // Only show absent for dates on/after the employee joined
                const joinDate = profile.date_of_joining
                    ? toLocalDateStr(new Date(profile.date_of_joining))
                    : (profile.created_at ? toLocalDateStr(new Date(profile.created_at)) : null);

                for (const dateStr of dates) {
                    // Skip dates before the employee joined
                    if (joinDate && dateStr < joinDate) continue;

                    if (!existingKeys.has(`${profile.id}_${dateStr}`)) {
                        summaries.push({
                            user_id: profile.id,
                            date: dateStr,
                            status: 'absent',
                            first_in: null,
                            last_out: null,
                            total_duration_minutes: null,
                            late_minutes: 0,
                            full_name: profile.full_name,
                            email: profile.email,
                            profiles: { full_name: profile.full_name, email: profile.email }
                        });
                    }
                }
            }

            // Re-sort by date descending
            summaries.sort((a, b) => {
                const da = typeof a.date === 'string' ? new Date(a.date + 'T00:00:00') : a.date;
                const db = typeof b.date === 'string' ? new Date(b.date + 'T00:00:00') : b.date;
                return db - da;
            });
        }

        res.json(summaries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const reprocessSummaries = async (req, res) => {
    const { date } = req.body;
    try {
        // Get all users who have punches on the given date
        const [users] = await pool.execute(
            'SELECT DISTINCT user_id FROM attendance_raw WHERE DATE(timestamp) = ?',
            [date]
        );

        for (const row of users) {
            await processDailySummary(row.user_id, date);
        }

        res.json({ message: 'Reprocessing completed', date, processed: users.length });
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

