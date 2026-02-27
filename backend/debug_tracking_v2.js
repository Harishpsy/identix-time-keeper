const pool = require('./config/db');
require('dotenv').config();

async function debug() {
    try {
        console.log('--- RAW ATTENDANCE ---');
        const [raw] = await pool.execute('SELECT id, user_id, punch_type, ip_address, latitude, longitude, timestamp FROM attendance_raw WHERE DATE(timestamp) = CURDATE() ORDER BY timestamp DESC');
        console.log(JSON.stringify(raw, null, 2));

        console.log('\n--- DAILY SUMMARIES ---');
        const [summaries] = await pool.execute('SELECT user_id, date, first_in, first_in_ip, first_in_lat, first_in_long FROM daily_summaries WHERE date = CURDATE()');
        console.log(JSON.stringify(summaries, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
