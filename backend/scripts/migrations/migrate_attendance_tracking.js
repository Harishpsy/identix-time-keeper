const pool = require('./config/db');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
    try {
        console.log('Starting IP & Geo Tracking migration...');

        // Add columns to attendance_raw
        console.log('Adding tracking columns to attendance_raw table...');

        const columns = [
            'ALTER TABLE attendance_raw ADD COLUMN ip_address VARCHAR(45)',
            'ALTER TABLE attendance_raw ADD COLUMN latitude DECIMAL(10, 8)',
            'ALTER TABLE attendance_raw ADD COLUMN longitude DECIMAL(11, 8)',
            'ALTER TABLE attendance_raw ADD COLUMN device_name VARCHAR(255)',
            'ALTER TABLE attendance_raw ADD COLUMN os_name VARCHAR(100)',
            'ALTER TABLE attendance_raw ADD COLUMN browser_name VARCHAR(100)',
            'ALTER TABLE attendance_raw ADD COLUMN location_name VARCHAR(255)'
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
