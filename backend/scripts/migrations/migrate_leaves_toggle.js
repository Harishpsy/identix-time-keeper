const pool = require('./config/db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('Adding leaves_enabled column to company_settings...');
        await pool.execute('ALTER TABLE company_settings ADD COLUMN leaves_enabled BOOLEAN DEFAULT true');
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column already exists, skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
