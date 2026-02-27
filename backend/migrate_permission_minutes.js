/**
 * Migration: Convert permission leave storage from fractional hours to whole minutes
 * 
 * Old: permission_used = 1.2 (hours)  → New: permission_used = 70 (minutes)
 * Old: permission_total = 3.0 (hours) → New: permission_total = 180 (minutes)
 * 
 * Run ONCE: node backend/migrate_permission_minutes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Converting permission leave values from hours → minutes...');

        // Multiply existing values by 60 to convert hours to minutes
        const [result] = await pool.execute(`
            UPDATE leave_balances
            SET 
                permission_used  = ROUND(permission_used  * 60),
                permission_total = ROUND(permission_total * 60)
            WHERE permission_total <= 24
        `);
        // Condition `<= 24` ensures we don't re-run on rows already in minutes

        console.log(`✅ Updated ${result.affectedRows} rows.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
