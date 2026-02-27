const pool = require('./config/db');
require('dotenv').config();

async function fix() {
    try {
        console.log('Fixing the most recent approved request...');

        // Find the most recent approved request without a name
        const [rows] = await pool.execute(`
            SELECT lr.id, r.role
            FROM leave_requests lr
            JOIN user_roles r ON lr.approved_by = r.user_id
            WHERE lr.status = 'approved' AND (lr.processed_by_name IS NULL OR lr.processed_by_name = '')
            ORDER BY lr.created_at DESC
            LIMIT 1
        `);

        if (rows.length > 0) {
            const row = rows[0];
            const name = row.role === 'super_admin' ? 'Super Admin' : 'Processor';
            console.log(`Updating request ${row.id} with name ${name}`);

            await pool.execute(`
                UPDATE leave_requests 
                SET processed_by_name = ?, processed_by_role = ?, processed_at = NOW()
                WHERE id = ?
            `, [name, row.role, row.id]);

            console.log('Update successful.');
        } else {
            console.log('No eligible requests found.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
