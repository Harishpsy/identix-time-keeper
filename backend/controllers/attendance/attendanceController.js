const { v4: uuidv4 } = require('uuid');
const pool = require('../../config/db');

// Helper: process daily summary for a user on a given date
const processDailySummary = async (userId, date) => {
    // Get all punches for this user on this date
    const [punches] = await pool.execute(
        'SELECT * FROM attendance_raw WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC',
        [userId, date]
    );

    if (punches.length === 0) return;

    const firstIn = punches[0].timestamp;
    const firstPunch = punches[0];
    const lastOut = punches.length > 1 ? punches[punches.length - 1].timestamp : null;

    // Calculate total break duration in minutes
    let totalBreakMinutes = 0;
    const breakStarts = punches.filter(p => p.punch_type === 'break_start');
    const breakEnds = punches.filter(p => p.punch_type === 'break_end');

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;

    for (let i = 0; i < breakStarts.length; i++) {
        const start = new Date(breakStarts[i].timestamp);
        let end = breakEnds[i] ? new Date(breakEnds[i].timestamp) : null;

        if (!end && i === breakStarts.length - 1 && breakStarts.length > breakEnds.length) {
            // Ongoing break
            if (isToday) {
                end = new Date(); // Use current time
            } else if (lastOut) {
                // For past days, if break_end is missing, use last_out if it's after start
                const potentialEnd = new Date(lastOut);
                if (potentialEnd > start) end = potentialEnd;
            }
        }

        if (end) {
            totalBreakMinutes += Math.floor((end - start) / 60000);
        }
    }

    // Calculate duration in minutes (Total time - Break time)
    let totalDurationMinutes = null;
    if (firstIn && lastOut) {
        const diffMs = new Date(lastOut) - new Date(firstIn);
        totalDurationMinutes = Math.floor(diffMs / 60000) - totalBreakMinutes;
        if (totalDurationMinutes < 0) totalDurationMinutes = 0;
    }

    // Get user's shift to calculate late minutes
    let lateMinutes = 0;
    let status = 'present';
    const [profiles] = await pool.execute('SELECT shift_id FROM profiles WHERE id = ?', [userId]);
    const [userRoles] = await pool.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    const userRole = userRoles.length > 0 ? userRoles[0].role : 'employee';

    let shift = null;
    if (profiles.length > 0 && profiles[0].shift_id) {
        const [shifts] = await pool.execute('SELECT * FROM shifts WHERE id = ?', [profiles[0].shift_id]);
        if (shifts.length > 0) {
            shift = shifts[0];
        }
    } else if (userRole === 'admin' || userRole === 'super_admin') {
        // Fallback for admins
        shift = {
            start_time: '09:00:00',
            grace_period_mins: 15
        };
    }

    if (shift) {
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
            `UPDATE daily_summaries SET 
                first_in = ?, last_out = ?, total_duration_minutes = ?, break_duration_minutes = ?, late_minutes = ?, status = ?,
                first_in_ip = ?, first_in_lat = ?, first_in_long = ?, first_in_device = ?, first_in_os = ?, first_in_browser = ?
             WHERE id = ?`,
            [
                firstIn, lastOut, totalDurationMinutes, totalBreakMinutes, lateMinutes, status,
                firstPunch.ip_address, firstPunch.latitude, firstPunch.longitude, firstPunch.device_name, firstPunch.os_name, firstPunch.browser_name,
                existing[0].id
            ]
        );
    } else {
        // Insert new
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO daily_summaries (
                id, user_id, date, first_in, last_out, total_duration_minutes, break_duration_minutes, late_minutes, status,
                first_in_ip, first_in_lat, first_in_long, first_in_device, first_in_os, first_in_browser
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, userId, date, firstIn, lastOut, totalDurationMinutes, totalBreakMinutes, lateMinutes, status,
                firstPunch.ip_address, firstPunch.latitude, firstPunch.longitude, firstPunch.device_name, firstPunch.os_name, firstPunch.browser_name
            ]
        );
    }
};

const logPunch = async (req, res) => {
    const { punch_type, latitude, longitude, device_name, os_name, browser_name, location_name } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    // Do not save punches for super_admin
    if (userRole === 'super_admin') {
        return res.json({ success: true, message: 'Super Admin punches are not recorded' });
    }

    const timestamp = new Date(); // Current server time
    const today = timestamp.toISOString().split('T')[0]; // yyyy-MM-dd

    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO attendance_raw (id, user_id, timestamp, punch_type, ip_address, latitude, longitude, device_name, os_name, browser_name, location_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userId, timestamp, punch_type || 'manual', ipAddress, latitude || null, longitude || null, device_name || null, os_name || null, browser_name || null, location_name || null]
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
        let query = 'SELECT s.*, p.full_name, p.email, d.name as department_name FROM daily_summaries s ' +
            'JOIN profiles p ON s.user_id = p.id ' +
            'JOIN user_roles r ON p.id = r.user_id ' +
            'LEFT JOIN departments d ON p.department_id = d.id ' +
            "WHERE r.role != 'super_admin'";
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
                'SELECT p.id, p.full_name, p.email, p.date_of_joining, p.created_at, d.name as department_name FROM profiles p ' +
                'JOIN user_roles r ON p.id = r.user_id ' +
                'LEFT JOIN departments d ON p.department_id = d.id ' +
                "WHERE p.is_active = true AND r.role != 'super_admin'"
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
                            department_name: profile.department_name
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
        const [profiles] = await pool.execute(
            'SELECT p.id, p.full_name, p.email, p.shift_id FROM profiles p ' +
            'JOIN user_roles r ON p.id = r.user_id ' +
            "WHERE p.is_active = true AND r.role != 'super_admin'"
        );
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


