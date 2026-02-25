const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Adding PDF BLOB columns to holidays table...');

        // Check if columns already exist to avoid errors on re-run
        const [columns] = await pool.execute('SHOW COLUMNS FROM holidays');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('pdf_content')) {
            await pool.execute('ALTER TABLE holidays ADD COLUMN pdf_content LONGBLOB');
            console.log('Added pdf_content column.');
        }

        if (!columnNames.includes('pdf_name')) {
            await pool.execute('ALTER TABLE holidays ADD COLUMN pdf_name VARCHAR(255)');
            console.log('Added pdf_name column.');
        }

        if (!columnNames.includes('pdf_mime')) {
            await pool.execute('ALTER TABLE holidays ADD COLUMN pdf_mime VARCHAR(50)');
            console.log('Added pdf_mime column.');
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
