require('dotenv').config({ path: './.env' });
const pool = require('../config/db');
async function run() {
    try {
        const [columns] = await pool.execute('SHOW COLUMNS FROM shifts');
        console.log('Shifts Columns:', JSON.stringify(columns, null, 2));
        
        const [users] = await pool.execute('SELECT id, full_name, shift_id FROM profiles WHERE full_name = "Testuser2"');
        console.log('User:', JSON.stringify(users, null, 2));
        
        if (users.length > 0) {
            const userId = users[0].id;
            const shiftId = users[0].shift_id;
            const [shifts] = await pool.execute('SELECT * FROM shifts WHERE id = ?', [shiftId]);
            console.log('Shift:', JSON.stringify(shifts, null, 2));
            
            const [leaves] = await pool.execute('SELECT * FROM leave_requests WHERE user_id = ? AND date = "2026-03-20"', [userId]);
            console.log('Leaves:', JSON.stringify(leaves, null, 2));
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
