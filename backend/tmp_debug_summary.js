require('dotenv').config({ path: './.env' });
const pool = require('./config/db');
async function run() {
    try {
        const [users] = await pool.execute('SELECT id FROM profiles WHERE full_name = "Testuser2"');
        if (users.length > 0) {
            const userId = users[0].id;
            const [summary] = await pool.execute('SELECT late_minutes, status, first_in FROM daily_summaries WHERE user_id = ? AND date = "2026-03-20"', [userId]);
            console.log('Summary Details:', JSON.stringify(summary, null, 2));
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
