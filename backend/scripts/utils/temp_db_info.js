const pool = require('./config/db');

async function getInfo() {
    try {
        const tables = ['profiles', 'departments', 'leave_requests', 'user_roles'];
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const [columns] = await pool.execute(`SHOW COLUMNS FROM ${table}`);
            console.table(columns);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getInfo();
