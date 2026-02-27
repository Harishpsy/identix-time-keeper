const pool = require('./config/db');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
    try {
        console.log('Starting Employee Management System migration...');
        console.log('DB Config:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME,
            passwordProvided: !!process.env.DB_PASS
        });

        // 1. Add manager_id to profiles
        console.log('Adding manager_id to profiles table...');
        await pool.execute('ALTER TABLE profiles ADD COLUMN manager_id CHAR(36)');
        await pool.execute('ALTER TABLE profiles ADD CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES users(id)');

        // 2. Add audit columns to leave_requests
        console.log('Adding audit columns to leave_requests table...');
        await pool.execute('ALTER TABLE leave_requests ADD COLUMN processed_by CHAR(36)');
        await pool.execute('ALTER TABLE leave_requests ADD COLUMN processed_by_role VARCHAR(50)');
        await pool.execute('ALTER TABLE leave_requests ADD COLUMN processed_by_name VARCHAR(255)');
        await pool.execute('ALTER TABLE leave_requests ADD COLUMN processed_at DATETIME');
        await pool.execute('ALTER TABLE leave_requests ADD CONSTRAINT fk_processed_by FOREIGN KEY (processed_by) REFERENCES users(id)');

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_FK_DUP_NAME') {
            console.log('Some elements already exist, continuing...');
            process.exit(0);
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    }
}

migrate();
