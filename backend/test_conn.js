
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('Testing connection with:');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Password Length:', process.env.DB_PASS ? process.env.DB_PASS.length : 0);
    console.log('Database:', process.env.DB_NAME);

    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });
        console.log('✅ Connection successful!');
        await conn.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('Error Code:', err.code);
    }
}

testConnection();
