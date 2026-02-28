/**
 * Fix payroll.month column type from INT to VARCHAR(10)
 * This allows storing 'YYYY-MM' format strings like '2024-01'
 * Run: node backend/scripts/migrations/migrate_fix_payroll_month.js
 * Run on PROD: $env:NODE_ENV='production'; node backend/scripts/migrations/migrate_fix_payroll_month.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const env = (process.env.NODE_ENV || 'development').trim();

async function migrate() {
    const conn = await mysql.createConnection({
        host: env === 'production' ? process.env.PROD_DB_HOST : process.env.DB_HOST,
        user: env === 'production' ? process.env.PROD_DB_USER : process.env.DB_USER,
        password: env === 'production' ? process.env.PROD_DB_PASS : process.env.DB_PASS,
        database: env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME,
        port: env === 'production' ? process.env.PROD_DB_PORT : process.env.DB_PORT,
    });

    const db = env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME;
    console.log(`\n🚀 Fixing payroll.month on: ${db} (${env} mode)\n`);

    try {
        // Get current column type
        const [cols] = await conn.execute(`SHOW COLUMNS FROM payroll WHERE Field = 'month'`);
        if (cols.length > 0 && cols[0].Type !== 'varchar(10)') {
            console.log(`  Current month type: ${cols[0].Type} — changing to VARCHAR(10)...`);
            // Drop the unique key first if it includes month
            try {
                await conn.execute(`ALTER TABLE payroll DROP INDEX idx_payroll_user_month`);
                console.log('  ✅ Dropped old unique index');
            } catch (e) {
                console.log(`  ⏭️  Index not found or already dropped: ${e.message}`);
            }
            // Modify column
            await conn.execute(`ALTER TABLE payroll MODIFY COLUMN month VARCHAR(10) NOT NULL`);
            console.log('  ✅ month column changed to VARCHAR(10)');
            // Re-add unique index
            try {
                await conn.execute(`ALTER TABLE payroll ADD UNIQUE KEY idx_payroll_user_month (user_id, month)`);
                console.log('  ✅ Unique index re-added on (user_id, month)');
            } catch (e) {
                console.log(`  ⏭️  Unique index: ${e.message}`);
            }
        } else {
            console.log(`  ⏭️  month is already VARCHAR(10), no change needed`);
        }

        // Also remove old simplified payroll columns that conflict with new schema
        // (base_salary, ta, other_allowances, pf_deduction, loan_deduction, gross_salary, 
        //  days_present, days_absent, days_leave, status, pdf_url, generated_at, paid_at, year)
        const oldCols = [
            'base_salary', 'ta', 'other_allowances', 'pf_deduction',
            'loan_deduction', 'gross_salary', 'days_present', 'days_absent',
            'days_leave', 'status', 'pdf_url', 'generated_at', 'paid_at', 'year'
        ];
        for (const col of oldCols) {
            try {
                await conn.execute(`ALTER TABLE payroll DROP COLUMN ${col}`);
                console.log(`  ✅ Dropped old column: payroll.${col}`);
            } catch (e) {
                if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`  ⏭️  Column doesn't exist: payroll.${col}`);
                } else {
                    console.log(`  ⚠️  Could not drop payroll.${col}: ${e.message}`);
                }
            }
        }

        console.log('\n🎉 Migration completed!\n');
    } catch (err) {
        console.error('\n❌ Migration FAILED:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

migrate();
