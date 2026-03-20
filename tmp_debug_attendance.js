const pool = require('./backend/config/db');
async function run() {
    try {
        const [users] = await pool.execute('SELECT id, full_name FROM profiles WHERE full_name = "Testuser2"');
        console.log('User:', JSON.stringify(users, null, 2));
        if (users.length > 0) {
            const userId = users[0].id;
            const [shifts] = await pool.execute('SELECT s.* FROM shifts s JOIN profiles p ON p.shift_id = s.id WHERE p.id = ?', [userId]);
            console.log('Shift:', JSON.stringify(shifts, null, 2));
            const [leaves] = await pool.execute('SELECT * FROM leave_requests WHERE user_id = ? AND date = "2026-03-20"', [userId]);
            console.log('Leaves:', JSON.stringify(leaves, null, 2));
            const [summary] = await pool.execute('SELECT * FROM daily_summaries WHERE user_id = ? AND date = "2026-03-20"', [userId]);
            console.log('Summary:', JSON.stringify(summary, null, 2));
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
