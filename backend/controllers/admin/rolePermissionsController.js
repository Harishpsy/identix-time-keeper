const pool = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/role-permissions — returns all permissions grouped by role
const getPermissions = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT role, module_key, is_enabled FROM role_permissions ORDER BY role, module_key');

        const grouped = {};
        for (const row of rows) {
            if (!grouped[row.role]) grouped[row.role] = {};
            grouped[row.role][row.module_key] = !!row.is_enabled;
        }

        res.json(grouped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/role-permissions/:role — returns permissions for a specific role
const getPermissionsByRole = async (req, res) => {
    const { role } = req.params;

    if (!['employee', 'subadmin', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be employee, subadmin, or admin.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT module_key, is_enabled FROM role_permissions WHERE role = ? ORDER BY module_key',
            [role]
        );

        const permissions = {};
        for (const row of rows) {
            permissions[row.module_key] = !!row.is_enabled;
        }

        res.json(permissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PUT /api/role-permissions — admin-only, update a permission
// Body: { role, module_key, is_enabled }
const updatePermission = async (req, res) => {
    const { role, module_key, is_enabled } = req.body;

    if (!role || !module_key || is_enabled === undefined) {
        return res.status(400).json({ error: 'role, module_key, and is_enabled are required' });
    }

    if (!['employee', 'subadmin', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be employee, subadmin, or admin.' });
    }

    try {
        const [existing] = await pool.execute(
            'SELECT id FROM role_permissions WHERE role = ? AND module_key = ?',
            [role, module_key]
        );

        if (existing.length === 0) {
            // Insert new permission row
            await pool.execute(
                'INSERT INTO role_permissions (id, role, module_key, is_enabled) VALUES (?, ?, ?, ?)',
                [uuidv4(), role, module_key, is_enabled]
            );
        } else {
            // Update existing
            await pool.execute(
                'UPDATE role_permissions SET is_enabled = ? WHERE role = ? AND module_key = ?',
                [is_enabled, role, module_key]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getPermissions, getPermissionsByRole, updatePermission };

