const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const register = async (req, res) => {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
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
                'INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)',
                [userId, full_name, email]
            );

            await connection.execute(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
                [uuidv4(), userId, 'employee']
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
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login, getMe, resetPassword };
