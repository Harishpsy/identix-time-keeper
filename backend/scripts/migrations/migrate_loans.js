const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log('Creating loans table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS loans (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                interest_rate DECIMAL(5, 2) DEFAULT 0.00,
                term_months INT NOT NULL,
                monthly_installment DECIMAL(10, 2) NOT NULL,
                total_repayable DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
                purpose TEXT,
                repayment_start_date DATE,
                approved_by CHAR(36),
                approved_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(id)
            )
        `);

        console.log('Creating loan_repayments table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS loan_repayments (
                id CHAR(36) PRIMARY KEY,
                loan_id CHAR(36) NOT NULL,
                payroll_id CHAR(36),
                amount DECIMAL(10, 2) NOT NULL,
                payment_date DATE NOT NULL,
                method ENUM('payroll_deduction', 'manual') DEFAULT 'payroll_deduction',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
            )
        `);

        // Check if role_permissions needs updating for the new 'loans' module
        const [roles] = await pool.execute('SELECT DISTINCT role FROM user_roles WHERE role IN ("employee", "subadmin")');

        console.log('Adding loan module to role_permissions...');
        for (const r of roles) {
            await pool.execute(
                `INSERT IGNORE INTO role_permissions (id, role, module_key, is_enabled) VALUES (?, ?, ?, ?)`,
                [uuidv4(), r.role, 'loans', true]
            );
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
