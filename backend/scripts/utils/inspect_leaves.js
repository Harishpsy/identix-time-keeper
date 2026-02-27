const pool = require('./config/db');
require('dotenv').config();

async function inspect() {
    try {
        console.log('Inspecting problematic leave request...');
        const [rows] = await pool.execute(`
            SELECT *
            FROM leave_requests lr
            WHERE lr.status != 'pending'
            ORDER BY lr.created_at DESC
            LIMIT 2
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
