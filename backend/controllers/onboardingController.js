const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { masterPool, getTenantPool } = require('../config/db');
const { isOfficialEmail } = require('../utils/emailValidator');
const { validatePassword } = require('../utils/passwordValidator');

/**
 * Handle new tenant registration/onboarding.
 */
const onboardTenant = async (req, res) => {
    const { tenantName, slug, adminEmail, adminPassword, adminFullName } = req.body;

    if (!tenantName || !slug || !adminEmail || !adminPassword || !adminFullName) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!isOfficialEmail(adminEmail)) {
        return res.status(400).json({ error: 'Please use an official company email address.' });
    }

    const passwordCheck = validatePassword(adminPassword);
    if (!passwordCheck.isValid) {
        return res.status(400).json({ error: passwordCheck.error });
    }

    const dbName = `identix_tenant_${slug.toLowerCase()}`;

    const connection = await masterPool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if name or slug already exists
        const [existing] = await connection.execute(
            'SELECT id FROM tenants WHERE name = ? OR slug = ?',
            [tenantName, slug.toLowerCase()]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Organization name or slug already exists.' });
        }

        // 2. Register in master pool
        const tenantId = uuidv4();
        await connection.execute(
            'INSERT INTO tenants (id, name, slug, db_name) VALUES (?, ?, ?, ?)',
            [tenantId, tenantName, slug.toLowerCase(), dbName]
        );

        // 2. Create the tenant database
        // (Note: query() is used here instead of execute() for DDL)
        await connection.query(`CREATE DATABASE \`${dbName}\``);

        // 3. Initialize schema in the new database
        const tenantPool = getTenantPool(dbName);
        const schemaPath = path.join(__dirname, '../database', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Clean up schema SQL (remove 'CREATE DATABASE' and 'USE' lines)
        const commands = schemaSql
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0)
            .filter(cmd => !cmd.toUpperCase().startsWith('CREATE DATABASE') && !cmd.toUpperCase().startsWith('USE'));

        const tenantConn = await tenantPool.getConnection();
        try {
            for (const cmd of commands) {
                await tenantConn.query(cmd);
            }

            // 4. Create the initial Admin user in the new tenant DB
            const adminId = uuidv4();
            const passwordHash = await bcrypt.hash(adminPassword, 10);

            await tenantConn.execute(
                'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
                [adminId, adminEmail, passwordHash]
            );

            await tenantConn.execute(
                'INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)',
                [adminId, adminFullName, adminEmail]
            );

            await tenantConn.execute(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
                [uuidv4(), adminId, 'super_admin']
            );

        } finally {
            tenantConn.release();
        }

        await connection.commit();
        res.status(201).json({ message: 'Tenant onboarded successfully.', tenantId, slug });

    } catch (err) {
        await connection.rollback();
        console.error('Onboarding error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Tenant slug or database already exists.' });
        }
        res.status(500).json({ error: 'Internal server error during onboarding.' });
    } finally {
        connection.release();
    }
};

module.exports = { onboardTenant };
