const express = require('express');
const { getHolidays, updateHolidays, uploadPdf, downloadPdf } = require('../controllers/holidayController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();

// Use memory storage for DB-bound files
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB just in case
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDFs are allowed'));
        }
    }
});

router.get('/', authMiddleware, getHolidays);
router.post('/', authMiddleware, roleMiddleware(['admin']), updateHolidays);
router.post('/upload-pdf', authMiddleware, roleMiddleware(['admin']), upload.single('pdf'), uploadPdf);
router.get('/download/:year', authMiddleware, downloadPdf);

module.exports = router;
