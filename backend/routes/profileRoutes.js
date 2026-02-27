const express = require('express');
const {
    getProfiles,
    getProfileById,
    updateProfile,
    deleteProfile,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getShifts,
    createShift,
    updateShift,
    deleteShift,
    getShiftById,
    updateTheme
} = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getProfiles);
router.patch('/update-theme', authMiddleware, updateTheme);
router.get('/departments', authMiddleware, getDepartments);
router.post('/departments', authMiddleware, roleMiddleware(['admin']), createDepartment);
router.patch('/departments/:id', authMiddleware, roleMiddleware(['admin']), updateDepartment);
router.delete('/departments/:id', authMiddleware, roleMiddleware(['admin']), deleteDepartment);
router.get('/shifts', authMiddleware, getShifts);
router.post('/shifts', authMiddleware, roleMiddleware(['admin']), createShift);
router.patch('/shifts/:id', authMiddleware, roleMiddleware(['admin']), updateShift);
router.delete('/shifts/:id', authMiddleware, roleMiddleware(['admin']), deleteShift);
router.get('/shifts/:id', authMiddleware, getShiftById);
router.get('/:id', authMiddleware, getProfileById);
// Self-update: any authenticated user can update their own personal details
router.patch('/me', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { phone_number, date_of_birth, gender, address } = req.body;
    const pool = require('../config/db');
    try {
        await pool.execute(
            'UPDATE profiles SET phone_number = ?, date_of_birth = ?, gender = ?, address = ? WHERE id = ?',
            [
                phone_number || null,
                date_of_birth || null,
                gender || null,
                address || null,
                userId
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
router.patch('/:id', authMiddleware, roleMiddleware(['admin']), updateProfile);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteProfile);

module.exports = router;
