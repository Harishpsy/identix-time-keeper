const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log('Creating holidays table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS holidays (
                id CHAR(36) PRIMARY KEY,
                year INT NOT NULL,
                details LONGTEXT,
                pdf_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (year)
            )
        `);

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
