const pool = require('./config/db');

async function verify() {
    try {
        console.log('Verifying holidays table columns...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM holidays');
        console.table(columns);

        const hasPdfContent = columns.some(c => c.Field === 'pdf_content');
        const hasPdfName = columns.some(c => c.Field === 'pdf_name');
        const hasPdfMime = columns.some(c => c.Field === 'pdf_mime');

        if (hasPdfContent && hasPdfName && hasPdfMime) {
            console.log('✅ All PDF storage columns are present.');
        } else {
            console.log('❌ Missing columns!');
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
