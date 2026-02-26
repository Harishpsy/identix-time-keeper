const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration for all connections
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// Master pool for SaaS management
const masterPool = mysql.createPool({
    ...dbConfig,
    database: 'identix_saas_master',
});

// Cache for tenant pools to avoid re-creating them on every request
const tenantPools = new Map();

/**
 * Get or create a connection pool for a specific tenant's database.
 * @param {string} dbName - The name of the tenant's database.
 * @returns {Pool} The MySQL connection pool.
 */
const getTenantPool = (dbName) => {
    if (!dbName) throw new Error('Database name is required to get tenant pool');

    if (tenantPools.has(dbName)) {
        return tenantPools.get(dbName);
    }

    const pool = mysql.createPool({
        ...dbConfig,
        database: dbName,
    });

    tenantPools.set(dbName, pool);
    return pool;
};

module.exports = {
    masterPool,
    getTenantPool,
    // Add original pool as fallback to avoid breaking everything immediately during transition
    pool: mysql.createPool({ ...dbConfig, database: process.env.DB_NAME })
};
