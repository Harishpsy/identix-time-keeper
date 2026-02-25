const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log('Creating role_permissions table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id CHAR(36) PRIMARY KEY,
                role ENUM('subadmin', 'employee') NOT NULL,
                module_key VARCHAR(100) NOT NULL,
                is_enabled BOOLEAN DEFAULT false,
                UNIQUE (role, module_key)
            )
        `);

        // Default permissions based on current hardcoded sidebar roles
        const defaults = [
            // Employee defaults
            { role: 'employee', module_key: 'attendance', is_enabled: true },
            { role: 'employee', module_key: 'leave_requests', is_enabled: true },
            { role: 'employee', module_key: 'my_payslips', is_enabled: true },
            { role: 'employee', module_key: 'employees', is_enabled: false },
            { role: 'employee', module_key: 'departments', is_enabled: false },
            { role: 'employee', module_key: 'shifts', is_enabled: false },
            { role: 'employee', module_key: 'payroll', is_enabled: false },
            { role: 'employee', module_key: 'attendance_reset', is_enabled: false },
            { role: 'employee', module_key: 'attendance_summary', is_enabled: false },
            { role: 'employee', module_key: 'company_branding', is_enabled: false },
            { role: 'employee', module_key: 'loans', is_enabled: true },
            { role: 'employee', module_key: 'holidays', is_enabled: true },
            // Subadmin defaults
            { role: 'subadmin', module_key: 'attendance', is_enabled: true },
            { role: 'subadmin', module_key: 'leave_requests', is_enabled: true },
            { role: 'subadmin', module_key: 'my_payslips', is_enabled: true },
            { role: 'subadmin', module_key: 'employees', is_enabled: false },
            { role: 'subadmin', module_key: 'departments', is_enabled: false },
            { role: 'subadmin', module_key: 'shifts', is_enabled: false },
            { role: 'subadmin', module_key: 'payroll', is_enabled: false },
            { role: 'subadmin', module_key: 'attendance_reset', is_enabled: false },
            { role: 'subadmin', module_key: 'attendance_summary', is_enabled: false },
            { role: 'subadmin', module_key: 'company_branding', is_enabled: false },
            { role: 'subadmin', module_key: 'loans', is_enabled: true },
            { role: 'subadmin', module_key: 'holidays', is_enabled: true },
        ];

        console.log('Seeding default permissions...');
        for (const perm of defaults) {
            await pool.execute(
                `INSERT IGNORE INTO role_permissions (id, role, module_key, is_enabled) VALUES (?, ?, ?, ?)`,
                [uuidv4(), perm.role, perm.module_key, perm.is_enabled]
            );
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
