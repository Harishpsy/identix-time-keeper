const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getHolidays = async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    try {
        const [holidays] = await pool.execute(
            'SELECT id, year, details, pdf_name, (pdf_content IS NOT NULL) as has_pdf FROM holidays WHERE year = ?',
            [year]
        );
        if (holidays.length === 0) {
            return res.json({ year, details: '', has_pdf: false });
        }
        res.json(holidays[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateHolidays = async (req, res) => {
    const { year, details, remove_pdf } = req.body;
    const role = req.user.role;

    if (role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // Check if record exists for the year
        const [existing] = await pool.execute('SELECT id FROM holidays WHERE year = ?', [year]);

        if (existing.length > 0) {
            let query = 'UPDATE holidays SET details = ?';
            const params = [details];

            if (remove_pdf) {
                query += ', pdf_content = NULL, pdf_name = NULL, pdf_mime = NULL';
            }

            query += ' WHERE year = ?';
            params.push(year);

            await pool.execute(query, params);
        } else {
            const id = uuidv4();
            await pool.execute(
                'INSERT INTO holidays (id, year, details) VALUES (?, ?, ?)',
                [id, year, details]
            );
        }
        res.json({ success: true, message: 'Holidays updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const uploadPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const year = req.query.year || req.body.year;
    if (!year) {
        return res.status(400).json({ error: 'Year is required' });
    }

    const { buffer, originalname, mimetype } = req.file;

    try {
        const [existing] = await pool.execute('SELECT id FROM holidays WHERE year = ?', [year]);

        if (existing.length > 0) {
            await pool.execute(
                'UPDATE holidays SET pdf_content = ?, pdf_name = ?, pdf_mime = ? WHERE year = ?',
                [buffer, originalname, mimetype, year]
            );
        } else {
            const id = uuidv4();
            await pool.execute(
                'INSERT INTO holidays (id, year, pdf_content, pdf_name, pdf_mime) VALUES (?, ?, ?, ?, ?)',
                [id, year, buffer, originalname, mimetype]
            );
        }
        res.json({ success: true, message: 'PDF uploaded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const downloadPdf = async (req, res) => {
    const { year } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT pdf_content, pdf_name, pdf_mime FROM holidays WHERE year = ?',
            [year]
        );

        if (rows.length === 0 || !rows[0].pdf_content) {
            return res.status(404).json({ error: 'PDF not found' });
        }

        const { pdf_content, pdf_name, pdf_mime } = rows[0];

        res.setHeader('Content-Type', pdf_mime || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdf_name || `Holidays_${year}.pdf`}"`);
        res.send(pdf_content);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getHolidays, updateHolidays, uploadPdf, downloadPdf };
