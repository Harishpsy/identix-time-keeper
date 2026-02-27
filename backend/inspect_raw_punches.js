const pool = require('./config/db');
require('dotenv').config();

async function inspect() {
    try {
        console.log('Inspecting raw punches for today...');
        const [rows] = await pool.execute(`
            SELECT id, user_id, timestamp, punch_type, ip_address, browser_name, os_name, latitude, longitude
            FROM attendance_raw
            WHERE DATE(timestamp) = CURDATE()
            ORDER BY timestamp DESC
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
