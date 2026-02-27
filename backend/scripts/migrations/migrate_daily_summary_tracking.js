const pool = require('./config/db');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
    try {
        console.log('Updating daily_summaries for tracking...');

        const columns = [
            'ALTER TABLE daily_summaries ADD COLUMN first_in_ip VARCHAR(45)',
            'ALTER TABLE daily_summaries ADD COLUMN first_in_lat DECIMAL(10, 8)',
            'ALTER TABLE daily_summaries ADD COLUMN first_in_long DECIMAL(11, 8)',
            'ALTER TABLE daily_summaries ADD COLUMN first_in_device VARCHAR(255)',
            'ALTER TABLE daily_summaries ADD COLUMN first_in_os VARCHAR(100)',
            'ALTER TABLE daily_summaries ADD COLUMN first_in_browser VARCHAR(100)'
        ];

        for (const sql of columns) {
            try {
                await pool.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column already exists, skipping: ${sql.split(' ').pop()}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
