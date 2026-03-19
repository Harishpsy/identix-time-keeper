/**
 * MIGRATION SCRIPT — Adds employer contribution columns to payroll table.
 * Run with: node backend/scripts/migrations/migrate_payroll_employer_contributions.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const env = (process.env.NODE_ENV || 'development').trim();

async function safe(conn, sql, label) {
    try {
        await conn.execute(sql);
        console.log(`  ✅  ${label}`);
    } catch (err) {
        const ignorable = ['ER_DUP_COLUMN_NAME'];
        if (ignorable.includes(err.code)) {
            console.log(`  ⏭️   Already exists, skip: ${label}`);
        } else {
            console.error(`  ❌  FAILED: ${label}`);
            throw err;
        }
    }
}

async function migrate() {
    const conn = await mysql.createConnection({
        host: env === 'production' ? process.env.PROD_DB_HOST : process.env.DB_HOST,
        user: env === 'production' ? process.env.PROD_DB_USER : process.env.DB_USER,
        password: env === 'production' ? process.env.PROD_DB_PASS : process.env.DB_PASS,
        database: env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME,
        port: env === 'production' ? process.env.PROD_DB_PORT : process.env.DB_PORT,
    });

    const db = env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME;
    console.log(`\n🚀  Adding employer contribution columns on: ${db} (${env} mode)\n`);

    try {
        await safe(conn, `ALTER TABLE payroll ADD COLUMN epf_employer DECIMAL(12,2) DEFAULT 0`, 'payroll.epf_employer');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN esi_employer DECIMAL(12,2) DEFAULT 0`, 'payroll.esi_employer');
        console.log('\n🎉  Migration completed successfully!\n');
    } catch (err) {
        console.error('\n❌  Migration FAILED:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

migrate();
