const pool = require('./config/db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('Adding sidebar_order column to company_settings...');
        // Using TEXT to store a JSON string of module keys in order
        await pool.execute('ALTER TABLE company_settings ADD COLUMN sidebar_order TEXT');
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
