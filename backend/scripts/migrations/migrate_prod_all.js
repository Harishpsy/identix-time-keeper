/**
 * Comprehensive safe migration for production database.
 * Uses IF NOT EXISTS pattern to avoid errors on already-applied columns.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const env = (process.env.NODE_ENV || 'development').trim();

async function safeAlter(conn, sql, label) {
    try {
        await conn.execute(sql);
        console.log(`✅ ${label}`);
    } catch (err) {
        if (
            err.code === 'ER_DUP_COLUMN_NAME' ||
            err.code === 'ER_DUP_KEY_NAME' ||
            err.code === 'ER_FK_DUP_NAME' ||
            (err.sqlMessage && err.sqlMessage.includes('Duplicate column'))
        ) {
            console.log(`⏭️  Already exists, skipping: ${label}`);
        } else {
            throw err;
        }
    }
}

async function migrate() {
    const conn = await mysql.createConnection({
        host:     env === 'production' ? process.env.PROD_DB_HOST     : process.env.DB_HOST,
        user:     env === 'production' ? process.env.PROD_DB_USER     : process.env.DB_USER,
        password: env === 'production' ? process.env.PROD_DB_PASS     : process.env.DB_PASS,
        database: env === 'production' ? process.env.PROD_DB_NAME     : process.env.DB_NAME,
        port:     env === 'production' ? process.env.PROD_DB_PORT     : process.env.DB_PORT,
    });

    console.log(`\n🚀 Running migrations on: ${env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME} (${env} mode)\n`);

    try {
        // ── leave_requests ──────────────────────────────────────────────────
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN to_date DATE DEFAULT NULL',
            'leave_requests.to_date'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN start_time TIME DEFAULT NULL',
            'leave_requests.start_time'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN end_time TIME DEFAULT NULL',
            'leave_requests.end_time'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN processed_by CHAR(36)',
            'leave_requests.processed_by'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN processed_by_role VARCHAR(50)',
            'leave_requests.processed_by_role'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN processed_by_name VARCHAR(255)',
            'leave_requests.processed_by_name'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_requests ADD COLUMN processed_at DATETIME',
            'leave_requests.processed_at'
        );

        // ── leave_balances ───────────────────────────────────────────────────
        await safeAlter(conn,
            'ALTER TABLE leave_balances ADD COLUMN permission_total INT NOT NULL DEFAULT 0',
            'leave_balances.permission_total'
        );
        await safeAlter(conn,
            'ALTER TABLE leave_balances ADD COLUMN permission_used INT NOT NULL DEFAULT 0',
            'leave_balances.permission_used'
        );

        // ── company_settings ─────────────────────────────────────────────────
        await safeAlter(conn,
            'ALTER TABLE company_settings ADD COLUMN default_permission_leaves INT NOT NULL DEFAULT 0',
            'company_settings.default_permission_leaves'
        );
        await safeAlter(conn,
            'ALTER TABLE company_settings ADD COLUMN sick_leave_enabled BOOLEAN NOT NULL DEFAULT true',
            'company_settings.sick_leave_enabled'
        );
        await safeAlter(conn,
            'ALTER TABLE company_settings ADD COLUMN casual_leave_enabled BOOLEAN NOT NULL DEFAULT true',
            'company_settings.casual_leave_enabled'
        );
        await safeAlter(conn,
            'ALTER TABLE company_settings ADD COLUMN annual_leave_enabled BOOLEAN NOT NULL DEFAULT true',
            'company_settings.annual_leave_enabled'
        );
        await safeAlter(conn,
            'ALTER TABLE company_settings ADD COLUMN permission_leave_enabled BOOLEAN NOT NULL DEFAULT true',
            'company_settings.permission_leave_enabled'
        );
        await safeAlter(conn,
            'ALTER TABLE company_settings ADD COLUMN sidebar_order TEXT',
            'company_settings.sidebar_order'
        );

        // ── profiles: manager_id (fk fix) ────────────────────────────────────
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN manager_id CHAR(36) DEFAULT NULL',
            'profiles.manager_id'
        );
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN onboarding_status VARCHAR(50) DEFAULT \'Approve\'',
            'profiles.onboarding_status'
        );
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN theme ENUM(\'light\', \'dark\') DEFAULT \'light\'',
            'profiles.theme'
        );
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN date_of_joining DATE',
            'profiles.date_of_joining'
        );
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN employee_id VARCHAR(50)',
            'profiles.employee_id'
        );
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN designation VARCHAR(255)',
            'profiles.designation'
        );

        // ── daily_summaries extra cols ────────────────────────────────────────
        await safeAlter(conn,
            "ALTER TABLE daily_summaries ADD COLUMN overtime_minutes INT DEFAULT 0",
            'daily_summaries.overtime_minutes'
        );
        await safeAlter(conn,
            "ALTER TABLE daily_summaries ADD COLUMN source VARCHAR(50) DEFAULT 'auto'",
            'daily_summaries.source'
        );

        // ── role_permissions table ────────────────────────────────────────────
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id CHAR(36) PRIMARY KEY,
                role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL,
                module_key VARCHAR(255) NOT NULL,
                is_enabled BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (role, module_key)
            )
        `);
        console.log('✅ role_permissions table (CREATE IF NOT EXISTS)');

        // ── holidays table ────────────────────────────────────────────────────
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS holidays (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                type ENUM('national', 'optional', 'company') DEFAULT 'national',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ holidays table (CREATE IF NOT EXISTS)');

        // ── payroll table ─────────────────────────────────────────────────────
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS payroll (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                month INT NOT NULL,
                year INT NOT NULL,
                base_salary DECIMAL(12,2) DEFAULT 0,
                hra DECIMAL(12,2) DEFAULT 0,
                ta DECIMAL(12,2) DEFAULT 0,
                other_allowances DECIMAL(12,2) DEFAULT 0,
                pf_deduction DECIMAL(12,2) DEFAULT 0,
                other_deductions DECIMAL(12,2) DEFAULT 0,
                loan_deduction DECIMAL(12,2) DEFAULT 0,
                gross_salary DECIMAL(12,2) DEFAULT 0,
                net_salary DECIMAL(12,2) DEFAULT 0,
                days_present INT DEFAULT 0,
                days_absent INT DEFAULT 0,
                days_leave INT DEFAULT 0,
                status ENUM('draft','generated','paid') DEFAULT 'draft',
                pdf_url TEXT,
                generated_at DATETIME,
                paid_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE(user_id, month, year),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ payroll table (CREATE IF NOT EXISTS)');

        console.log('\n🎉 All migrations completed successfully!\n');
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

migrate();
