const pool = require('../../config/db');

async function migrate() {
    try {
        console.log('Updating leave_requests.type ENUM to include "half_day"...');
        
        await pool.execute("ALTER TABLE leave_requests MODIFY COLUMN type ENUM('sick', 'casual', 'annual', 'permission', 'other', 'half_day') NOT NULL DEFAULT 'casual'");
        
        console.log('✅ Migration successful! The Half Day option should now work.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
