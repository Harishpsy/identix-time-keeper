const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const getHolidays = async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    try {
        const [holidays] = await pool.execute(
            'SELECT * FROM holidays WHERE year = ?',
            [year]
        );
        if (holidays.length === 0) {
            return res.json({ year, details: '', pdf_url: null });
        }
        res.json(holidays[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateHolidays = async (req, res) => {
    const { year, details, pdf_url } = req.body;
    const role = req.user.role;

    if (role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // Check if record exists for the year
        const [existing] = await pool.execute('SELECT id FROM holidays WHERE year = ?', [year]);

        if (existing.length > 0) {
            await pool.execute(
                'UPDATE holidays SET details = ?, pdf_url = ? WHERE year = ?',
                [details, pdf_url, year]
            );
        } else {
            const id = uuidv4();
            await pool.execute(
                'INSERT INTO holidays (id, year, details, pdf_url) VALUES (?, ?, ?, ?)',
                [id, year, details, pdf_url]
            );
        }
        res.json({ success: true, message: 'Holidays updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const uploadPdf = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const pdfUrl = `/uploads/${req.file.filename}`;
    res.json({ pdf_url: pdfUrl });
};

module.exports = { getHolidays, updateHolidays, uploadPdf };
