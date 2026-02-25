const pool = require('./config/db');

async function check() {
    try {
        const year = new Date().getFullYear();
        const [settings] = await pool.execute('SELECT default_sick_leaves, default_casual_leaves, default_annual_leaves, default_permission_leaves FROM company_settings LIMIT 1');
        const s = settings[0];
        console.log('Using settings:', s);

        const [result] = await pool.execute(
            `UPDATE leave_balances 
             SET sick_total = ?, casual_total = ?, annual_total = ?, permission_total = ? 
             WHERE year = ?`,
            [s.default_sick_leaves, s.default_casual_leaves, s.default_annual_leaves, s.default_permission_leaves, year]
        );
        console.log('Update result:', result);

        const [balances] = await pool.execute('SELECT * FROM leave_balances');
        console.log('Post-sync Leave Balances:');
        console.table(balances);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
