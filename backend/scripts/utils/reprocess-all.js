const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function processDailySummary(userId, dateStr) {
    const [punches] = await pool.execute(
        'SELECT * FROM attendance_raw WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC',
        [userId, dateStr]
    );

    if (punches.length === 0) {
        console.log(`  No punches found`);
        return;
    }

    const firstIn = punches[0].timestamp;
    const lastOut = punches.length > 1 ? punches[punches.length - 1].timestamp : null;

    let totalDurationMinutes = null;
    if (firstIn && lastOut) {
        const diffMs = new Date(lastOut) - new Date(firstIn);
        totalDurationMinutes = Math.floor(diffMs / 60000);
    }

    let lateMinutes = 0;
    let status = 'present';

    const [existing] = await pool.execute(
        'SELECT id FROM daily_summaries WHERE user_id = ? AND date = ?',
        [userId, dateStr]
    );

    if (existing.length > 0) {
        await pool.execute(
            'UPDATE daily_summaries SET first_in = ?, last_out = ?, total_duration_minutes = ?, late_minutes = ?, status = ? WHERE id = ?',
            [firstIn, lastOut, totalDurationMinutes, lateMinutes, status, existing[0].id]
        );
        console.log(`  Updated summary`);
    } else {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO daily_summaries (id, user_id, date, first_in, last_out, total_duration_minutes, late_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userId, dateStr, firstIn, lastOut, totalDurationMinutes, lateMinutes, status]
        );
        console.log(`  Created summary id=${id}`);
    }
}

async function run() {
    try {
        const [records] = await pool.execute(
            "SELECT DISTINCT user_id, CAST(DATE(timestamp) AS CHAR) as punch_date FROM attendance_raw"
        );

        console.log(`Found ${records.length} user/date combos`);
        for (const record of records) {
            console.log(`Processing user=${record.user_id} date=${record.punch_date}`);
            await processDailySummary(record.user_id, record.punch_date);
        }

        const [summaries] = await pool.execute('SELECT * FROM daily_summaries');
        console.log(`\nFinal count: ${summaries.length} summaries`);
        summaries.forEach(s => console.log(`  date=${s.date} status=${s.status} dur=${s.total_duration_minutes}min`));

        console.log("Done!");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

run();
