const express = require('express');
const {
    getOnboardingStatus,
    updateOnboardingProfile,
    uploadDocument,
    submitOnboarding,
    getOnboardingDashboard,
    getOnboardingDocuments,
    verifyOnboarding
} = require('../../controllers/admin/onboardingController');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure upload directory exists
const onboardingDir = path.join(__dirname, '../../uploads/onboarding');
if (!fs.existsSync(onboardingDir)) {
    fs.mkdirSync(onboardingDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, onboardingDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
});

// Employee onboarding routes
router.get('/status', authMiddleware, getOnboardingStatus);
router.patch('/profile', authMiddleware, updateOnboardingProfile);
router.post('/upload', authMiddleware, upload.single('document'), uploadDocument);
router.post('/submit', authMiddleware, submitOnboarding);

// Admin onboarding routes
router.get('/dashboard', authMiddleware, roleMiddleware(['admin', 'subadmin']), getOnboardingDashboard);
router.get('/documents/:userId', authMiddleware, roleMiddleware(['admin', 'subadmin', 'super_admin']), getOnboardingDocuments);
router.post('/verify', authMiddleware, roleMiddleware(['admin', 'subadmin']), verifyOnboarding);

module.exports = router;
