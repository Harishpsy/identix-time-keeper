const pool = require('../config/db');

async function dump() {
    try {
        const [punches] = await pool.execute('SELECT id, user_id, timestamp, punch_type FROM attendance_raw ORDER BY timestamp DESC LIMIT 5');
        console.log("PUNCHES:", punches.length);
        punches.forEach(p => console.log(`  ${p.punch_type} | ${p.timestamp} | user=${p.user_id}`));

        const [summaries] = await pool.execute('SELECT id, user_id, date, first_in, last_out, status FROM daily_summaries ORDER BY date DESC LIMIT 5');
        console.log("SUMMARIES:", summaries.length);
        summaries.forEach(s => console.log(`  ${s.date} | in=${s.first_in} | out=${s.last_out} | ${s.status} | user=${s.user_id}`));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

dump();
