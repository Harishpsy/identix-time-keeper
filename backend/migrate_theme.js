const pool = require('./config/db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('Adding theme column to profiles...');
        // Default to 'light' theme
        await pool.execute("ALTER TABLE profiles ADD COLUMN theme ENUM('light', 'dark') DEFAULT 'light'");
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
