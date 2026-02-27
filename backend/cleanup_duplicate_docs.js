const pool = require('./config/db');
require('dotenv').config();

async function cleanup() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // For each user + document_type combination, keep only the latest row
        const [duplicates] = await connection.execute(`
            SELECT user_id, document_type, COUNT(*) as cnt
            FROM onboarding_documents
            GROUP BY user_id, document_type
            HAVING cnt > 1
        `);

        console.log(`Found ${duplicates.length} duplicate document_type groups to clean up.`);

        for (const dup of duplicates) {
            // Get all rows for this user + type, ordered by created_at desc
            const [rows] = await connection.execute(
                'SELECT id FROM onboarding_documents WHERE user_id = ? AND document_type = ? ORDER BY created_at DESC',
                [dup.user_id, dup.document_type]
            );
            // Keep the first (newest), delete the rest
            const idsToDelete = rows.slice(1).map(r => r.id);
            if (idsToDelete.length > 0) {
                await connection.execute(
                    `DELETE FROM onboarding_documents WHERE id IN (${idsToDelete.map(() => '?').join(',')})`,
                    idsToDelete
                );
                console.log(`  Deleted ${idsToDelete.length} old records for user ${dup.user_id}, type: ${dup.document_type}`);
            }
        }

        await connection.commit();
        console.log('Cleanup complete.');
    } catch (err) {
        await connection.rollback();
        console.error('Cleanup failed:', err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

cleanup();
