const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    console.log('Starting Super Admin migration...');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Update Enums in both tables
        console.log('Updating role ENUMs in user_roles and role_permissions...');
        await connection.execute(`
            ALTER TABLE user_roles 
            MODIFY COLUMN role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL
        `);
        await connection.execute(`
            ALTER TABLE role_permissions 
            MODIFY COLUMN role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL
        `);

        // 2. Identify the first admin and promote to super_admin
        console.log('Promoting current admin(s) to super_admin...');
        const [admins] = await connection.execute("SELECT user_id FROM user_roles WHERE role = 'admin'");

        if (admins.length > 0) {
            for (const admin of admins) {
                await connection.execute(
                    "UPDATE user_roles SET role = 'super_admin' WHERE user_id = ?",
                    [admin.user_id]
                );
                console.log(`User ${admin.user_id} promoted to super_admin.`);
            }
        } else {
            console.log('No admin found to promote. Please ensure an admin exists.');
        }

        // 3. Initialize default permissions for 'admin' role in role_permissions
        console.log('Initializing permissions for regular admin role...');
        const modules = [
            "attendance", "leave_requests", "my_payslips", "employees",
            "departments", "shifts", "payroll", "attendance_reset",
            "attendance_summary", "company_branding", "loans", "holidays"
        ];

        for (const mod of modules) {
            const [existing] = await connection.execute(
                "SELECT id FROM role_permissions WHERE role = 'admin' AND module_key = ?",
                [mod]
            );
            if (existing.length === 0) {
                await connection.execute(
                    "INSERT INTO role_permissions (id, role, module_key, is_enabled) VALUES (?, 'admin', ?, true)",
                    [uuidv4(), mod]
                );
            }
        }

        await connection.commit();
        console.log('Migration completed successfully.');
    } catch (err) {
        await connection.rollback();
        console.error('Migration failed:', err);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
