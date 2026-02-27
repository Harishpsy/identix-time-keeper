require('dotenv').config({ path: './backend/.env' });
const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Starting User Onboarding Module migration...');

        // 1. Add columns to profiles
        console.log('Adding onboarding columns to profiles table...');
        const columnsToAdd = [
            'ADD COLUMN phone_number VARCHAR(20)',
            'ADD COLUMN date_of_birth DATE',
            'ADD COLUMN gender VARCHAR(20)',
            'ADD COLUMN address TEXT',
            'ADD COLUMN employee_id VARCHAR(50) UNIQUE',
            'ADD COLUMN designation VARCHAR(100)',
            'ADD COLUMN employment_type ENUM(\'Full-time\', \'Part-time\', \'Contract\', \'Intern\')',
            'ADD COLUMN work_location VARCHAR(255)',
            'ADD COLUMN onboarding_status ENUM(\'Draft\', \'Pending Submission\', \'Under Review\', \'Approved\', \'Rejected\', \'Active\') DEFAULT \'Draft\''
        ];

        for (const col of columnsToAdd) {
            try {
                await pool.execute(`ALTER TABLE profiles ${col}`);
                console.log(`Successfully executed: ALTER TABLE profiles ${col}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`Column already exists, skipping: ${col}`);
                } else {
                    throw err;
                }
            }
        }

        // 2. Create onboarding_documents table
        console.log('Creating onboarding_documents table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS onboarding_documents (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                document_type VARCHAR(100) NOT NULL,
                file_path TEXT NOT NULL,
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                verification_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 3. Create onboarding_audit_logs table
        console.log('Creating onboarding_audit_logs table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS onboarding_audit_logs (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                action VARCHAR(100) NOT NULL,
                performed_by CHAR(36),
                performed_by_name VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (performed_by) REFERENCES users(id)
            )
        `);

        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
