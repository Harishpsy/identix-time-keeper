/**
 * DEBUG SCRIPT — Checks for data consistency between 'users' and 'profiles' tables.
 * Run with: node backend/scripts/debug_payroll_fk.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const env = (process.env.NODE_ENV || 'development').trim();

async function debug() {
    const conn = await mysql.createConnection({
        host: env === 'production' ? process.env.PROD_DB_HOST : process.env.DB_HOST,
        user: env === 'production' ? process.env.PROD_DB_USER : process.env.DB_USER,
        password: env === 'production' ? process.env.PROD_DB_PASS : process.env.DB_PASS,
        database: env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME,
        port: env === 'production' ? process.env.PROD_DB_PORT : process.env.DB_PORT,
    });

    try {
        console.log('\n🔍 Checking for data consistency...\n');

        // 1. Check for profiles without users
        const [orphans] = await conn.execute(`
            SELECT p.id, p.full_name, p.email 
            FROM profiles p 
            LEFT JOIN users u ON p.id = u.id 
            WHERE u.id IS NULL
        `);

        if (orphans.length > 0) {
            console.error(`❌ Found ${orphans.length} orphaned profiles (exist in profiles but not in users):`);
            console.table(orphans);
            console.log('\nThis is why payroll creation is failing. These employees cannot have payroll because they lack a main user record.');
        } else {
            console.log('✅ All profiles have corresponding user records.');
        }

        // 2. Check the payroll table FKs
        const [fks] = await conn.execute(`
            SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = 'payroll' AND TABLE_SCHEMA = DATABASE()
        `);
        console.log('\n📊 Payroll Table Constraints:');
        console.table(fks);

    } catch (err) {
        console.error('\n❌ Debug FAILED:', err.message);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

debug();
