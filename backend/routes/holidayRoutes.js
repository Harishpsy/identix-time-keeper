const express = require('express');
const { getHolidays, updateHolidays, uploadPdf } = require('../controllers/holidayController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.resolve(__dirname, '../uploads');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `holidays_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

module.exports = router;
