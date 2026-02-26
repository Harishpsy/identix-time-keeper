const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { isOfficialEmail } = require('../utils/emailValidator');
const { validatePassword } = require('../utils/passwordValidator');
// Removed global pool import

/**
 * Ensures the tenant database has all required tables and columns.
 * Acts as a lightweight migration runner.
 */
const ensureSchema = async (pool) => {
    try {
        // 1. Ensure user_roles has super_admin in ENUM (if possible)
        // Note: Altering ENUM can be tricky in some MySQL versions without downtime, 
        // but since we are in dev, we'll try to add it.
        try {
            await pool.query("ALTER TABLE user_roles MODIFY COLUMN role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL");
        } catch (e) {
            // Ignore if already updated or fail silently
        }

        // 2. Create role_permissions if missing
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL,
                module_key VARCHAR(50) NOT NULL,
                is_enabled BOOLEAN DEFAULT true,
                UNIQUE (role, module_key)
            )
        `);

        // 3. Add to_date to leave_requests if missing
        try {
            await pool.query("ALTER TABLE leave_requests ADD COLUMN to_date DATE AFTER date");
        } catch (e) { }

        // Add half_day to leave_requests type enum
        try {
            await pool.query("ALTER TABLE leave_requests MODIFY COLUMN type ENUM('sick', 'casual', 'annual', 'permission', 'other', 'half_day') NOT NULL DEFAULT 'casual'");
        } catch (e) { }

        // 4. Add permission_total etc to leave_balances if missing
        try {
            await pool.query("ALTER TABLE leave_balances ADD COLUMN permission_total INT NOT NULL DEFAULT 2 AFTER annual_used");
            await pool.query("ALTER TABLE leave_balances ADD COLUMN permission_used INT NOT NULL DEFAULT 0 AFTER permission_total");
        } catch (e) { }

        // 5. Ensure holidays table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS holidays (
                id CHAR(36) PRIMARY KEY,
                year INT NOT NULL,
                details TEXT,
                pdf_content LONGBLOB,
                pdf_name VARCHAR(255),
                pdf_mime VARCHAR(100),
                UNIQUE (year)
            )
        `);

        // 6. Ensure payroll table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payroll (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                month VARCHAR(7) NOT NULL,
                basic_salary DECIMAL(10, 2) DEFAULT 0,
                hra DECIMAL(10, 2) DEFAULT 0,
                dearness_allowance DECIMAL(10, 2) DEFAULT 0,
                conveyance_allowance DECIMAL(10, 2) DEFAULT 0,
                medical_allowance DECIMAL(10, 2) DEFAULT 0,
                special_allowance DECIMAL(10, 2) DEFAULT 0,
                overtime DECIMAL(10, 2) DEFAULT 0,
                bonus DECIMAL(10, 2) DEFAULT 0,
                other_earnings DECIMAL(10, 2) DEFAULT 0,
                epf_employee DECIMAL(10, 2) DEFAULT 0,
                esi_employee DECIMAL(10, 2) DEFAULT 0,
                professional_tax DECIMAL(10, 2) DEFAULT 0,
                tds DECIMAL(10, 2) DEFAULT 0,
                loan_recovery DECIMAL(10, 2) DEFAULT 0,
                other_deductions DECIMAL(10, 2) DEFAULT 0,
                gross_earnings DECIMAL(10, 2) DEFAULT 0,
                total_deductions DECIMAL(10, 2) DEFAULT 0,
                net_salary DECIMAL(10, 2) DEFAULT 0,
                paid_days INT DEFAULT 0,
                lop_days INT DEFAULT 0,
                released BOOLEAN DEFAULT false,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, month),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 7. Update daily_summaries to use total_duration_minutes if needed
        try {
            await pool.query("ALTER TABLE daily_summaries ADD COLUMN total_duration_minutes INT DEFAULT NULL AFTER last_out");
        } catch (e) { }

        // 8. Auto-promote first admin to super_admin if no super_admin exists
        const [superAdmins] = await pool.query("SELECT user_id FROM user_roles WHERE role = 'super_admin' LIMIT 1");
        if (superAdmins.length === 0) {
            console.log("[Migration] No super_admin found. Promoting first admin...");
            const [admins] = await pool.query("SELECT id, user_id FROM user_roles WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
            if (admins.length > 0) {
                await pool.query("UPDATE user_roles SET role = 'super_admin' WHERE id = ?", [admins[0].id]);
                console.log(`[Migration] User ${admins[0].user_id} promoted to super_admin.`);
            }
        }

    } catch (err) {
        console.error("[Migration] Error ensuring schema:", err);
    }
};

const register = async (req, res) => {
    const { email, password, full_name, biometric_id, department_id, shift_id, role, date_of_joining } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (!isOfficialEmail(email)) {
        return res.status(400).json({ error: 'Only official company email addresses are allowed.' });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
        return res.status(400).json({ error: passwordCheck.error });
    }

    // Role restriction: Admin can only create employee or subadmin
    const requesterRole = req.user.role;
    const targetRole = role || 'employee';

    if (requesterRole === 'admin' && (targetRole === 'admin' || targetRole === 'super_admin')) {
        return res.status(403).json({ error: 'Admins can only create Employee or Sub-Admin accounts' });
    }

    try {
        const [existing] = await req.tenantPool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        const connection = await req.tenantPool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.execute(
                'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
                [userId, email, passwordHash]
            );

            await connection.execute(
                'INSERT INTO profiles (id, full_name, email, biometric_id, department_id, shift_id, date_of_joining) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    userId,
                    full_name,
                    email,
                    biometric_id || null,
                    department_id || null,
                    shift_id || null,
                    date_of_joining || null
                ]
            );

            await connection.execute(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
                [uuidv4(), userId, role || 'employee']
            );

            // Initialize leave balances for the current year
            const year = new Date().getFullYear();
            const [settings] = await connection.execute('SELECT default_sick_leaves, default_casual_leaves, default_annual_leaves, default_permission_leaves FROM company_settings LIMIT 1');
            const s = settings[0] || { default_sick_leaves: 12, default_casual_leaves: 12, default_annual_leaves: 15, default_permission_leaves: 0 };

            await connection.execute(
                'INSERT INTO leave_balances (id, user_id, year, sick_total, casual_total, annual_total, permission_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), userId, year, s.default_sick_leaves, s.default_casual_leaves, s.default_annual_leaves, s.default_permission_leaves]
            );

            await connection.commit();
            res.status(201).json({ message: 'User registered successfully', userId });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Migration: Ensure the tenant schema is up to date on every login
        await ensureSchema(req.tenantPool);

        const [users] = await req.tenantPool.execute(
            `SELECT u.*, r.role, p.is_active, p.full_name 
             FROM users u 
             JOIN user_roles r ON u.id = r.user_id 
             JOIN profiles p ON u.id = p.id
             WHERE u.email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getMe = async (req, res) => {
    try {
        const [profiles] = await req.tenantPool.execute(
            'SELECT p.*, r.role FROM profiles p JOIN user_roles r ON p.id = r.user_id WHERE p.id = ?',
            [req.user.id]
        );

        if (profiles.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profiles[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
        return res.status(400).json({ error: 'User ID and new password are required' });
    }

    try {
        // Check if the target user is a super admin – super admin passwords can only be changed from the database
        const [roles] = await req.tenantPool.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
        if (roles.length > 0 && roles[0].role === 'super_admin') {
            return res.status(403).json({ error: 'Super Admin password can only be changed directly from the database' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await req.tenantPool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login, getMe, resetPassword };
