const mysql = require('mysql2/promise');
require('dotenv').config();

const env = (process.env.NODE_ENV || 'development').trim();

const pool = mysql.createPool({
    host: env === 'production' ? process.env.PROD_DB_HOST : process.env.DB_HOST,
    user: env === 'production' ? process.env.PROD_DB_USER : process.env.DB_USER,
    password: env === 'production' ? process.env.PROD_DB_PASS : process.env.DB_PASS,
    database: env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME,
    port: env === 'production' ? process.env.PROD_DB_PORT : process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

console.log(`Connected to database: ${env === 'production' ? process.env.PROD_DB_NAME : process.env.DB_NAME} (${env} mode)`);

module.exports = pool;
