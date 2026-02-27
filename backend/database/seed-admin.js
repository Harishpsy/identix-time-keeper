/**
 * Seed script to create tables (if needed) and an admin user in the database.
 * 
 * Usage:  node database/seed-admin.js
 * 
 * Admin credentials after running:
 *   Email:    admin@identixhr.com
 *   Password: Admin@123
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const ADMIN_EMAIL = 'admin@identixhr.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Admin';

async function seedAdmin() {
    const connection = await pool.getConnection();
    try {
        // --- Step 1: Run schema.sql to ensure all tables exist ---
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

        // Split by semicolons and run each statement
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            try {
                await connection.execute(stmt);
            } catch (err) {
                // Ignore "already exists" and duplicate entry errors
                if (!err.message.includes('already exists') && !err.message.includes('Duplicate entry')) {
                    console.warn(`  ⚠  Warning: ${err.message.split('\n')[0]}`);
                }
            }
        }
        console.log('  ✅ Database tables verified.\n');

        // --- Step 2: Create admin user ---
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [ADMIN_EMAIL]
        );

        if (existing.length > 0) {
            console.log(`  Admin user already exists (${ADMIN_EMAIL}). Skipping.\n`);
            process.exit(0);
        }

        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await connection.beginTransaction();

        // Insert into users table
        await connection.execute(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [userId, ADMIN_EMAIL, passwordHash]
        );

        // Insert into profiles table
        await connection.execute(
            'INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)',
            [userId, ADMIN_NAME, ADMIN_EMAIL]
        );

        // Insert into user_roles table with 'admin' role
        await connection.execute(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [uuidv4(), userId, 'admin']
        );

        await connection.commit();

        console.log('  ✅ Admin user created successfully!');
        console.log('  ─────────────────────────────────');
        console.log(`  Email:    ${ADMIN_EMAIL}`);
        console.log(`  Password: ${ADMIN_PASSWORD}`);
        console.log(`  Role:     admin`);
        console.log(`  ID:       ${userId}\n`);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Failed to create admin user:', err.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

seedAdmin();
