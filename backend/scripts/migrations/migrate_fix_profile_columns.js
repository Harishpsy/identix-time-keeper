
/**
 * Migration to fix missing and misnamed columns in 'profiles' table.
 * Specifically adds 'is_active' and renames 'phone_number' to 'phone' (or adds 'phone').
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
            err.code === 'ER_BAD_FIELD_ERROR' || // Column not found for RENAME
            err.sqlMessage && (err.sqlMessage.includes('Duplicate column') || err.sqlMessage.includes('Unknown column'))
        ) {
            console.log(`⏭️  Skipping/Already handled: ${label} (${err.code})`);
        } else {
            console.error(`❌ FAILED: ${label}`);
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

    console.log(`\n🚀 Running fix migration on: ${env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME} (${env} mode)\n`);

    try {
        // 1. Add is_active if missing
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true',
            'profiles.is_active'
        );

        // 2. Handle phone_number to phone rename/addition
        // First try to rename if it exists
        try {
            await conn.execute('ALTER TABLE profiles CHANGE COLUMN phone_number phone VARCHAR(30) DEFAULT NULL');
            console.log('✅ Renamed phone_number to phone');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || (err.sqlMessage && err.sqlMessage.includes("Unknown column 'phone_number'"))) {
                // If phone_number doesn't exist, try adding phone directly
                await safeAlter(conn,
                    'ALTER TABLE profiles ADD COLUMN phone VARCHAR(30) DEFAULT NULL',
                    'profiles.phone'
                );
            } else if (err.code === 'ER_DUP_COLUMN_NAME' || (err.sqlMessage && err.sqlMessage.includes('Duplicate column'))) {
                 console.log('⏭️  Column phone already exists, skipping rename');
            } else {
                throw err;
            }
        }

        // 3. Ensure other columns from select exist
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN date_of_birth DATE DEFAULT NULL',
            'profiles.date_of_birth'
        );
        await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN gender VARCHAR(20) DEFAULT NULL',
            'profiles.gender'
        );
         await safeAlter(conn,
            'ALTER TABLE profiles ADD COLUMN address TEXT DEFAULT NULL',
            'profiles.address'
        );

        console.log('\n🎉 Fix migration completed successfully!\n');
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

migrate();
