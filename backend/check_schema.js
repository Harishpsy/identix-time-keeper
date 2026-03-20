
const mysql = require('mysql2/promise');
require('dotenv').config();

const env = (process.env.NODE_ENV || 'development').trim();

async function checkSchema() {
    const conn = await mysql.createConnection({
        host: env === 'production' ? process.env.PROD_DB_HOST : process.env.DB_HOST,
        user: env === 'production' ? process.env.PROD_DB_USER : process.env.DB_USER,
        password: env === 'production' ? process.env.PROD_DB_PASS : process.env.DB_PASS,
        database: env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME,
        port: env === 'production' ? process.env.PROD_DB_PORT : process.env.DB_PORT,
    });

    try {
        console.log(`Checking schema for table 'profiles' in database: ${env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME}`);
        const [columns] = await conn.execute('DESCRIBE profiles');
        console.table(columns);
    } catch (err) {
        console.error('Error checking schema:', err.message);
    } finally {
        await conn.end();
    }
}

checkSchema();
