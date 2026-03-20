const pool = require('./config/db');

async function run() {
    const today = new Date().toISOString().split('T')[0];
    const email = 'testuser2@gmail.com';
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
        const userId = users[0].id;
        const [summaries] = await pool.execute('SELECT * FROM daily_summaries WHERE user_id = ? AND date = ?', [userId, today]);
        console.log('Daily Summary:', JSON.stringify(summaries[0], null, 2));
        
        const [punches] = await pool.execute('SELECT * FROM attendance_raw WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC', [userId, today]);
        console.log('Punches Count:', punches.length);
        punches.forEach(p => console.log(`${p.punch_type}: ${p.timestamp}`));
    }
    process.exit(0);
}

run();
