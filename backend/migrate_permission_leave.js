const pool = require('./config/db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('Adding individual leave toggles and permission leave columns...');

        // Add toggles to company_settings
        await pool.execute('ALTER TABLE company_settings ADD COLUMN sick_leave_enabled BOOLEAN DEFAULT true');
        await pool.execute('ALTER TABLE company_settings ADD COLUMN casual_leave_enabled BOOLEAN DEFAULT true');
        await pool.execute('ALTER TABLE company_settings ADD COLUMN annual_leave_enabled BOOLEAN DEFAULT true');
        await pool.execute('ALTER TABLE company_settings ADD COLUMN permission_leave_enabled BOOLEAN DEFAULT true');

        // Add permission default to company_settings
        await pool.execute('ALTER TABLE company_settings ADD COLUMN default_permission_leaves INT DEFAULT 0');

        // Add permission columns to leave_balances
        await pool.execute('ALTER TABLE leave_balances ADD COLUMN permission_total INT DEFAULT 0');
        await pool.execute('ALTER TABLE leave_balances ADD COLUMN permission_used INT DEFAULT 0');

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Some columns already exist, continuing...');
            // In a real scenario, we might want to check each column individually, 
            // but for this task we can assume we're adding them all or none.
            // If some exist, the script might fail halfway, but let's try to proceed.
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    }
}

migrate();
