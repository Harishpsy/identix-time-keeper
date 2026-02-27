const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const register = async (req, res) => {
    const { email, password, full_name, biometric_id, department_id, shift_id, role, date_of_joining, manager_id, designation, employee_id } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Role restriction: Admin can only create employee or subadmin
    const requesterRole = req.user.role;
    const targetRole = role || 'employee';

    if (requesterRole === 'admin' && (targetRole === 'admin' || targetRole === 'super_admin')) {
        return res.status(403).json({ error: 'Admins can only create Employee or Sub-Admin accounts' });
    }

    try {
        const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.execute(
                'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
                [userId, email, passwordHash]
            );

            await connection.execute(
                'INSERT INTO profiles (id, full_name, email, biometric_id, department_id, shift_id, date_of_joining, manager_id, designation, employee_id, onboarding_status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    userId,
                    full_name,
                    email,
                    biometric_id || null,
                    department_id || null,
                    shift_id || null,
                    date_of_joining || null,
                    manager_id || null,
                    designation || null,
                    employee_id || null,
                    'Draft',
                    false // Deactivated until onboarding completion/approval
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
        const [users] = await pool.execute(
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
        const [profiles] = await pool.execute(
            `SELECT p.*, r.role, d.name as department_name, m.full_name as manager_name 
             FROM profiles p 
             JOIN user_roles r ON p.id = r.user_id 
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN profiles m ON p.manager_id = m.id
             WHERE p.id = ?`,
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
        const [roles] = await pool.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
        if (roles.length > 0 && roles[0].role === 'super_admin') {
            return res.status(403).json({ error: 'Super Admin password can only be changed directly from the database' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login, getMe, resetPassword };
