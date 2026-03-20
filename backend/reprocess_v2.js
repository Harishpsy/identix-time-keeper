const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');

const processDailySummary = async (userId, date) => {
    const [punches] = await pool.execute(
        'SELECT * FROM attendance_raw WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC',
        [userId, date]
    );

    if (punches.length === 0) return;

    const firstIn = punches[0].timestamp;
    const firstPunch = punches[0];
    const lastOut = punches.length > 1 ? punches[punches.length - 1].timestamp : null;

    let totalBreakMinutes = 0;
    const breakStarts = punches.filter(p => p.punch_type === 'break_start');
    const breakEnds = punches.filter(p => p.punch_type === 'break_end');

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;

    for (let i = 0; i < breakStarts.length; i++) {
        const start = new Date(breakStarts[i].timestamp);
        let end = breakEnds[i] ? new Date(breakEnds[i].timestamp) : null;
        
        if (!end && i === breakStarts.length - 1 && breakStarts.length > breakEnds.length) {
            if (isToday) {
                end = new Date();
            } else if (lastOut) {
                const potentialEnd = new Date(lastOut);
                if (potentialEnd > start) end = potentialEnd;
            }
        }
        
        if (end) {
            totalBreakMinutes += Math.floor((end - start) / 60000);
        }
    }

    let totalDurationMinutes = null;
    if (firstIn && lastOut) {
        const diffMs = new Date(lastOut) - new Date(firstIn);
        totalDurationMinutes = Math.floor(diffMs / 60000) - totalBreakMinutes;
        if (totalDurationMinutes < 0) totalDurationMinutes = 0;
    }

    let lateMinutes = 0;
    let status = 'present';
    const [profiles] = await pool.execute('SELECT shift_id FROM profiles WHERE id = ?', [userId]);
    const [userRoles] = await pool.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    const userRole = userRoles.length > 0 ? userRoles[0].role : 'employee';

    let shift = null;
    if (profiles.length > 0 && profiles[0].shift_id) {
        const [shifts] = await pool.execute('SELECT * FROM shifts WHERE id = ?', [profiles[0].shift_id]);
        if (shifts.length > 0) shift = shifts[0];
    } else if (userRole === 'admin' || userRole === 'super_admin') {
        shift = { start_time: '09:00:00', grace_period_mins: 15 };
    }

    if (shift) {
        const firstInDate = new Date(firstIn);
        const [shiftHour, shiftMin] = shift.start_time.split(':').map(Number);
        const shiftStart = new Date(firstInDate);
        shiftStart.setHours(shiftHour, shiftMin + (shift.grace_period_mins || 0), 0, 0);
        if (firstInDate > shiftStart) {
            lateMinutes = Math.floor((firstInDate - shiftStart) / 60000);
            status = 'late';
        }
    }

    const [approvedLeaves] = await pool.execute(
        "SELECT type FROM leave_requests WHERE user_id = ? AND date = ? AND status = 'approved' AND type IN ('half_day') LIMIT 1",
        [userId, date]
    );
    if (approvedLeaves.length > 0) status = approvedLeaves[0].type;

    const [existing] = await pool.execute('SELECT id FROM daily_summaries WHERE user_id = ? AND date = ?', [userId, date]);

    if (existing.length > 0) {
        await pool.execute(
            `UPDATE daily_summaries SET 
                first_in = ?, last_out = ?, total_duration_minutes = ?, break_duration_minutes = ?, late_minutes = ?, status = ?
             WHERE id = ?`,
            [firstIn, lastOut, totalDurationMinutes, totalBreakMinutes, lateMinutes, status, existing[0].id]
        );
    } else {
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO daily_summaries (id, user_id, date, first_in, last_out, total_duration_minutes, break_duration_minutes, late_minutes, status, first_in_ip, first_in_lat, first_in_long, first_in_device, first_in_os, first_in_browser) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, date, firstIn, lastOut, totalDurationMinutes, totalBreakMinutes, lateMinutes, status, firstPunch.ip_address, firstPunch.latitude, firstPunch.longitude, firstPunch.device_name, firstPunch.os_name, firstPunch.browser_name]
        );
    }
};

async function run() {
    const today = new Date().toISOString().split('T')[0];
    const [users] = await pool.execute('SELECT DISTINCT user_id FROM attendance_raw WHERE DATE(timestamp) = ?', [today]);
    for (const row of users) {
        await processDailySummary(row.user_id, today);
    }
    process.exit(0);
}

run();
