const pool = require('../../config/db');

async function migrate() {
    try {
        console.log('Adding break_duration_minutes column to daily_summaries...');
        
        await pool.execute("ALTER TABLE daily_summaries ADD COLUMN break_duration_minutes INT DEFAULT 0");
        
        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('⏭️  Column already exists, skipping.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
