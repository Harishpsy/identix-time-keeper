const pool = require('../config/db');

const getAdminStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Total active employees
        const [totalRes] = await pool.execute('SELECT COUNT(*) as count FROM profiles WHERE is_active = true');
        const total = totalRes[0].count;

        // Today's summary stats
        const [summaryRes] = await pool.execute(
            'SELECT ' +
            "COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as present, " +
            "COUNT(CASE WHEN status = 'late' THEN 1 END) as late, " +
            "COUNT(CASE WHEN status IN ('absent', 'on_leave') THEN 1 END) as absent " +
            'FROM daily_summaries WHERE date = ?',
            [today]
        );

        const { present = 0, late = 0, absent = 0 } = summaryRes[0] || {};

        res.json({
            total,
            present,
            late,
            absent: Math.max(absent, total - present)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTodayLeave = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Get employees who are explicitly marked absent/on_leave/half_day in daily_summaries
        const [explicitLeave] = await pool.execute(
            'SELECT s.*, p.full_name, p.email FROM daily_summaries s ' +
            'JOIN profiles p ON s.user_id = p.id ' +
            "WHERE s.date = ? AND s.status IN ('absent', 'on_leave', 'half_day') " +
            'ORDER BY p.full_name ASC',
            [today]
        );

        // Get active employees who have NO attendance record today (absent by default)
        const [noRecord] = await pool.execute(
            "SELECT p.id as user_id, p.full_name, p.email, ? as date, 'absent' as status, " +
            'NULL as first_in, NULL as last_out, NULL as total_duration_minutes, 0 as late_minutes ' +
            'FROM profiles p ' +
            'WHERE p.is_active = true ' +
            'AND p.id NOT IN (SELECT user_id FROM daily_summaries WHERE date = ?) ' +
            'AND p.id NOT IN (SELECT DISTINCT user_id FROM attendance_raw WHERE DATE(timestamp) = ?) ' +
            'ORDER BY p.full_name ASC',
            [today, today, today]
        );

        // Get employees with approved leave requests for today
        const [leaveRequests] = await pool.execute(
            "SELECT lr.user_id, p.full_name, p.email, ? as date, 'on_leave' as status, " +
            'NULL as first_in, NULL as last_out, NULL as total_duration_minutes, 0 as late_minutes ' +
            'FROM leave_requests lr ' +
            'JOIN profiles p ON lr.user_id = p.id ' +
            "WHERE lr.status = 'approved' AND ? BETWEEN lr.date AND lr.to_date " +
            'AND lr.user_id NOT IN (SELECT user_id FROM daily_summaries WHERE date = ?) ' +
            'ORDER BY p.full_name ASC',
            [today, today, today]
        );

        // Combine and deduplicate by user_id
        const seen = new Set();
        const combined = [];
        for (const record of [...explicitLeave, ...leaveRequests, ...noRecord]) {
            if (!seen.has(record.user_id)) {
                seen.add(record.user_id);
                combined.push(record);
            }
        }

        res.json(combined);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAnniversaries = async (req, res) => {
    try {
        const [profiles] = await pool.execute(
            'SELECT id, full_name, date_of_joining FROM profiles WHERE is_active = true AND date_of_joining IS NOT NULL'
        );

        const today = new Date();
        const currentYear = today.getFullYear();

        const upcoming = profiles.map(p => {
            const joinDate = new Date(p.date_of_joining);
            const joinYear = joinDate.getFullYear();
            const yearsCompleting = currentYear - joinYear;

            // This year's anniversary
            let anniversary = new Date(currentYear, joinDate.getMonth(), joinDate.getDate());

            // If passed, next year
            if (anniversary < new Date(today.setHours(0, 0, 0, 0))) {
                anniversary = new Date(currentYear + 1, joinDate.getMonth(), joinDate.getDate());
            }

            const diffMs = anniversary.getTime() - new Date().setHours(0, 0, 0, 0);
            const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

            return {
                id: p.id,
                fullName: p.full_name,
                dateOfJoining: p.date_of_joining,
                daysUntil,
                yearsCompleting: anniversary.getFullYear() - joinYear
            };
        })
            .filter(e => e.yearsCompleting >= 1 && e.daysUntil <= 30) // Next 30 days
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5);

        res.json(upcoming);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getEmployeeDashboard = async (req, res) => {
    const userId = req.user.id;
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${year}-${month}%`;

        const [summaries] = await pool.execute(
            'SELECT * FROM daily_summaries WHERE user_id = ? AND date LIKE ? ORDER BY date DESC',
            [userId, monthPrefix]
        );

        const stats = {
            present: summaries.filter(s => s.status === 'present').length,
            late: summaries.filter(s => s.status === 'late').length,
            leaveTaken: summaries.filter(s => ['absent', 'on_leave', 'half_day'].includes(s.status)).length
        };

        res.json({ stats, summaries });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getAdminStats, getTodayLeave, getAnniversaries, getEmployeeDashboard };
