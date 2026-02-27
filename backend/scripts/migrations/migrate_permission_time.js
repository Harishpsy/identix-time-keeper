const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration: adding start_time and end_time to leave_requests...');

        await pool.execute('ALTER TABLE leave_requests ADD COLUMN start_time TIME DEFAULT NULL');
        await pool.execute('ALTER TABLE leave_requests ADD COLUMN end_time TIME DEFAULT NULL');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
