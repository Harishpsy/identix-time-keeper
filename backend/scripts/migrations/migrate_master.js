/**
 * MASTER MIGRATION SCRIPT — runs on both dev and prod databases.
 * Safe: each ALTER uses duplicate-column-name error handling.
 * Run with: node backend/scripts/migrations/migrate_master.js
 * Run on PROD with: $env:NODE_ENV='production'; node backend/scripts/migrations/migrate_master.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const env = (process.env.NODE_ENV || 'development').trim();

async function safe(conn, sql, label) {
    try {
        await conn.execute(sql);
        console.log(`  ✅  ${label}`);
    } catch (err) {
        const ignorable = [
            'ER_DUP_COLUMN_NAME',
            'ER_DUP_KEY_NAME',
            'ER_FK_DUP_NAME',
            'ER_TABLE_EXISTS_ERROR',
        ];
        if (ignorable.includes(err.code) || (err.sqlMessage && err.sqlMessage.includes('Duplicate column'))) {
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
        multipleStatements: false,
    });

    const db = env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME;
    console.log(`\n🚀  Master migration on: ${db} (${env} mode)\n`);

    try {
        // ════════════════════════════════════════════
        // 1. attendance_raw
        // ════════════════════════════════════════════
        console.log('\n── attendance_raw ──────────────────────────────');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN ip_address VARCHAR(100) DEFAULT NULL`, 'attendance_raw.ip_address');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN latitude DECIMAL(10,7) DEFAULT NULL`, 'attendance_raw.latitude');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN longitude DECIMAL(10,7) DEFAULT NULL`, 'attendance_raw.longitude');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN device_name VARCHAR(255) DEFAULT NULL`, 'attendance_raw.device_name');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN os_name VARCHAR(100) DEFAULT NULL`, 'attendance_raw.os_name');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN browser_name VARCHAR(100) DEFAULT NULL`, 'attendance_raw.browser_name');
        await safe(conn, `ALTER TABLE attendance_raw ADD COLUMN location_name VARCHAR(255) DEFAULT NULL`, 'attendance_raw.location_name');

        // ════════════════════════════════════════════
        // 2. daily_summaries
        // ════════════════════════════════════════════
        console.log('\n── daily_summaries ─────────────────────────────');
        // Rename total_duration (TIME) → total_duration_minutes (INT) if old column exists
        // We add new column; if old one exists both will coexist harmlessly
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN total_duration_minutes INT DEFAULT NULL`, 'daily_summaries.total_duration_minutes');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN first_in_ip VARCHAR(100) DEFAULT NULL`, 'daily_summaries.first_in_ip');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN first_in_lat DECIMAL(10,7) DEFAULT NULL`, 'daily_summaries.first_in_lat');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN first_in_long DECIMAL(10,7) DEFAULT NULL`, 'daily_summaries.first_in_long');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN first_in_device VARCHAR(255) DEFAULT NULL`, 'daily_summaries.first_in_device');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN first_in_os VARCHAR(100) DEFAULT NULL`, 'daily_summaries.first_in_os');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN first_in_browser VARCHAR(100) DEFAULT NULL`, 'daily_summaries.first_in_browser');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN overtime_minutes INT DEFAULT 0`, 'daily_summaries.overtime_minutes');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN source VARCHAR(50) DEFAULT 'auto'`, 'daily_summaries.source');
        await safe(conn, `ALTER TABLE daily_summaries ADD COLUMN is_manual_override BOOLEAN DEFAULT false`, 'daily_summaries.is_manual_override');

        // ════════════════════════════════════════════
        // 3. shifts
        // ════════════════════════════════════════════
        console.log('\n── shifts ──────────────────────────────────────');
        await safe(conn, `ALTER TABLE shifts ADD COLUMN total_working_hours DECIMAL(4,2) DEFAULT 8.00`, 'shifts.total_working_hours');
        await safe(conn, `ALTER TABLE shifts ADD COLUMN max_break_minutes INT DEFAULT 60`, 'shifts.max_break_minutes');

        // ════════════════════════════════════════════
        // 4. profiles
        // ════════════════════════════════════════════
        console.log('\n── profiles ────────────────────────────────────');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN phone_number VARCHAR(30) DEFAULT NULL`, 'profiles.phone_number');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN date_of_birth DATE DEFAULT NULL`, 'profiles.date_of_birth');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN gender VARCHAR(20) DEFAULT NULL`, 'profiles.gender');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN address TEXT DEFAULT NULL`, 'profiles.address');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN employee_id VARCHAR(50) DEFAULT NULL`, 'profiles.employee_id');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN designation VARCHAR(255) DEFAULT NULL`, 'profiles.designation');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN date_of_joining DATE DEFAULT NULL`, 'profiles.date_of_joining');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN manager_id CHAR(36) DEFAULT NULL`, 'profiles.manager_id');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN onboarding_status VARCHAR(50) DEFAULT 'Approve'`, 'profiles.onboarding_status');
        await safe(conn, `ALTER TABLE profiles ADD COLUMN theme ENUM('light','dark') DEFAULT 'light'`, 'profiles.theme');

        // ════════════════════════════════════════════
        // 5. leave_requests
        // ════════════════════════════════════════════
        console.log('\n── leave_requests ───────────────────────────────');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN to_date DATE DEFAULT NULL`, 'leave_requests.to_date');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN start_time TIME DEFAULT NULL`, 'leave_requests.start_time');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN end_time TIME DEFAULT NULL`, 'leave_requests.end_time');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN processed_by CHAR(36) DEFAULT NULL`, 'leave_requests.processed_by');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN processed_by_role VARCHAR(50) DEFAULT NULL`, 'leave_requests.processed_by_role');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN processed_by_name VARCHAR(255) DEFAULT NULL`, 'leave_requests.processed_by_name');
        await safe(conn, `ALTER TABLE leave_requests ADD COLUMN processed_at DATETIME DEFAULT NULL`, 'leave_requests.processed_at');

        // ════════════════════════════════════════════
        // 6. leave_balances
        // ════════════════════════════════════════════
        console.log('\n── leave_balances ──────────────────────────────');
        await safe(conn, `ALTER TABLE leave_balances ADD COLUMN permission_total INT NOT NULL DEFAULT 0`, 'leave_balances.permission_total');
        await safe(conn, `ALTER TABLE leave_balances ADD COLUMN permission_used INT NOT NULL DEFAULT 0`, 'leave_balances.permission_used');

        // ════════════════════════════════════════════
        // 7. company_settings
        // ════════════════════════════════════════════
        console.log('\n── company_settings ─────────────────────────────');
        await safe(conn, `ALTER TABLE company_settings ADD COLUMN default_permission_leaves INT NOT NULL DEFAULT 0`, 'company_settings.default_permission_leaves');
        await safe(conn, `ALTER TABLE company_settings ADD COLUMN sick_leave_enabled BOOLEAN NOT NULL DEFAULT true`, 'company_settings.sick_leave_enabled');
        await safe(conn, `ALTER TABLE company_settings ADD COLUMN casual_leave_enabled BOOLEAN NOT NULL DEFAULT true`, 'company_settings.casual_leave_enabled');
        await safe(conn, `ALTER TABLE company_settings ADD COLUMN annual_leave_enabled BOOLEAN NOT NULL DEFAULT true`, 'company_settings.annual_leave_enabled');
        await safe(conn, `ALTER TABLE company_settings ADD COLUMN permission_leave_enabled BOOLEAN NOT NULL DEFAULT true`, 'company_settings.permission_leave_enabled');
        await safe(conn, `ALTER TABLE company_settings ADD COLUMN sidebar_order TEXT DEFAULT NULL`, 'company_settings.sidebar_order');

        // ════════════════════════════════════════════
        // 8. holidays (correct schema)
        // ════════════════════════════════════════════
        console.log('\n── holidays ────────────────────────────────────');
        // The old simplified table may exist; we need to add missing columns
        await safe(conn, `ALTER TABLE holidays ADD COLUMN year INT NOT NULL DEFAULT 0`, 'holidays.year');
        await safe(conn, `ALTER TABLE holidays ADD COLUMN details LONGTEXT DEFAULT NULL`, 'holidays.details');
        await safe(conn, `ALTER TABLE holidays ADD COLUMN pdf_content LONGBLOB DEFAULT NULL`, 'holidays.pdf_content');
        await safe(conn, `ALTER TABLE holidays ADD COLUMN pdf_name VARCHAR(255) DEFAULT NULL`, 'holidays.pdf_name');
        await safe(conn, `ALTER TABLE holidays ADD COLUMN pdf_mime VARCHAR(100) DEFAULT NULL`, 'holidays.pdf_mime');
        // Add unique index on year if not exists
        try {
            await conn.execute(`ALTER TABLE holidays ADD UNIQUE INDEX idx_holidays_year (year)`);
            console.log('  ✅  holidays unique index on year');
        } catch (e) {
            if (e.code === 'ER_DUP_KEY_NAME' || e.code === 'ER_DUP_ENTRY') {
                console.log('  ⏭️   holidays year index already exists');
            } else {
                console.log(`  ⚠️   holidays year index: ${e.message}`);
            }
        }

        // ════════════════════════════════════════════
        // 9. payroll (correct schema — drop simplified and recreate)
        // ════════════════════════════════════════════
        console.log('\n── payroll ─────────────────────────────────────');
        // Add all payroll-specific columns (creating table if not exists already handled)
        await safe(conn, `ALTER TABLE payroll ADD COLUMN basic_salary DECIMAL(12,2) DEFAULT 0`, 'payroll.basic_salary');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN dearness_allowance DECIMAL(12,2) DEFAULT 0`, 'payroll.dearness_allowance');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN conveyance_allowance DECIMAL(12,2) DEFAULT 0`, 'payroll.conveyance_allowance');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN medical_allowance DECIMAL(12,2) DEFAULT 0`, 'payroll.medical_allowance');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN special_allowance DECIMAL(12,2) DEFAULT 0`, 'payroll.special_allowance');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN overtime DECIMAL(12,2) DEFAULT 0`, 'payroll.overtime');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN bonus DECIMAL(12,2) DEFAULT 0`, 'payroll.bonus');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN other_earnings DECIMAL(12,2) DEFAULT 0`, 'payroll.other_earnings');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN epf_employee DECIMAL(12,2) DEFAULT 0`, 'payroll.epf_employee');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN esi_employee DECIMAL(12,2) DEFAULT 0`, 'payroll.esi_employee');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN professional_tax DECIMAL(12,2) DEFAULT 0`, 'payroll.professional_tax');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN tds DECIMAL(12,2) DEFAULT 0`, 'payroll.tds');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN loan_recovery DECIMAL(12,2) DEFAULT 0`, 'payroll.loan_recovery');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN other_deductions DECIMAL(12,2) DEFAULT 0`, 'payroll.other_deductions');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN gross_earnings DECIMAL(12,2) DEFAULT 0`, 'payroll.gross_earnings');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN total_deductions DECIMAL(12,2) DEFAULT 0`, 'payroll.total_deductions');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN paid_days INT DEFAULT 0`, 'payroll.paid_days');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN lop_days INT DEFAULT 0`, 'payroll.lop_days');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN notes TEXT DEFAULT NULL`, 'payroll.notes');
        await safe(conn, `ALTER TABLE payroll ADD COLUMN released BOOLEAN DEFAULT false`, 'payroll.released');
        // month column should be VARCHAR to support 'YYYY-MM' format
        await safe(conn, `ALTER TABLE payroll ADD COLUMN month VARCHAR(10) DEFAULT NULL`, 'payroll.month');

        // ════════════════════════════════════════════
        // 10. New tables
        // ════════════════════════════════════════════
        console.log('\n── New tables ──────────────────────────────────');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id CHAR(36) PRIMARY KEY,
                role ENUM('super_admin','admin','subadmin','employee') NOT NULL,
                module_key VARCHAR(255) NOT NULL,
                is_enabled BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (role, module_key)
            )
        `);
        console.log('  ✅  role_permissions');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS onboarding_documents (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                document_type VARCHAR(100) NOT NULL,
                file_path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅  onboarding_documents');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS onboarding_audit_logs (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                action VARCHAR(255) NOT NULL,
                performed_by CHAR(36) DEFAULT NULL,
                performed_by_name VARCHAR(255) DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅  onboarding_audit_logs');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS holidays (
                id CHAR(36) PRIMARY KEY,
                year INT NOT NULL,
                details LONGTEXT DEFAULT NULL,
                pdf_content LONGBLOB DEFAULT NULL,
                pdf_name VARCHAR(255) DEFAULT NULL,
                pdf_mime VARCHAR(100) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY idx_holidays_year (year)
            )
        `);
        console.log('  ✅  holidays (CREATE IF NOT EXISTS)');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS payroll (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                month VARCHAR(10) NOT NULL,
                basic_salary DECIMAL(12,2) DEFAULT 0,
                hra DECIMAL(12,2) DEFAULT 0,
                dearness_allowance DECIMAL(12,2) DEFAULT 0,
                conveyance_allowance DECIMAL(12,2) DEFAULT 0,
                medical_allowance DECIMAL(12,2) DEFAULT 0,
                special_allowance DECIMAL(12,2) DEFAULT 0,
                overtime DECIMAL(12,2) DEFAULT 0,
                bonus DECIMAL(12,2) DEFAULT 0,
                other_earnings DECIMAL(12,2) DEFAULT 0,
                epf_employee DECIMAL(12,2) DEFAULT 0,
                esi_employee DECIMAL(12,2) DEFAULT 0,
                professional_tax DECIMAL(12,2) DEFAULT 0,
                tds DECIMAL(12,2) DEFAULT 0,
                loan_recovery DECIMAL(12,2) DEFAULT 0,
                other_deductions DECIMAL(12,2) DEFAULT 0,
                gross_earnings DECIMAL(12,2) DEFAULT 0,
                total_deductions DECIMAL(12,2) DEFAULT 0,
                net_salary DECIMAL(12,2) DEFAULT 0,
                paid_days INT DEFAULT 0,
                lop_days INT DEFAULT 0,
                notes TEXT DEFAULT NULL,
                released BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY idx_payroll_user_month (user_id, month),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅  payroll (CREATE IF NOT EXISTS)');

        console.log('\n🎉  All migrations completed successfully!\n');
    } catch (err) {
        console.error('\n❌  Migration FAILED:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

migrate();
