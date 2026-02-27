const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function cleanupSuperAdminData() {
    console.log('Starting cleanup of Super Admin attendance data...');
    try {
        // Find super_admin user IDs
        const [superAdmins] = await pool.execute(
            "SELECT user_id FROM user_roles WHERE role = 'super_admin'"
        );

        if (superAdmins.length === 0) {
            console.log('No Super Admin accounts found.');
            return;
        }

        const ids = superAdmins.map(sa => sa.user_id);
        const placeholders = ids.map(() => '?').join(',');

        // Delete from attendance_raw
        const [rawRes] = await pool.execute(
            `DELETE FROM attendance_raw WHERE user_id IN (${placeholders})`,
            ids
        );
        console.log(`Deleted ${rawRes.affectedRows} records from attendance_raw.`);

        // Delete from daily_summaries
        const [summaryRes] = await pool.execute(
            `DELETE FROM daily_summaries WHERE user_id IN (${placeholders})`,
            ids
        );
        console.log(`Deleted ${summaryRes.affectedRows} records from daily_summaries.`);

        console.log('Cleanup completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanupSuperAdminData();
