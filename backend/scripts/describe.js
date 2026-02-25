const pool = require('../config/db');
async function run() {
    const [rows] = await pool.execute("SHOW COLUMNS FROM attendance_raw WHERE Field = 'punch_type'");
    console.log(JSON.stringify(rows[0]));
    process.exit();
}
run();
