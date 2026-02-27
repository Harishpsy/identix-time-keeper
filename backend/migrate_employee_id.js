const pool = require('./config/db');
require('dotenv').config();

async function migrate() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Add employee_id column to profiles table if it doesn't exist
        const [cols] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'profiles' 
            AND COLUMN_NAME = 'employee_id'
        `);

        if (cols.length === 0) {
            console.log('Adding employee_id column to profiles...');
            await connection.execute(`
                ALTER TABLE profiles 
                ADD COLUMN employee_id VARCHAR(50) NULL UNIQUE AFTER biometric_id
            `);
            console.log('employee_id column added successfully.');
        } else {
            console.log('employee_id column already exists, skipping.');
        }

        await connection.commit();
        console.log('Migration complete.');
    } catch (err) {
        await connection.rollback();
        console.error('Migration failed:', err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

migrate();
