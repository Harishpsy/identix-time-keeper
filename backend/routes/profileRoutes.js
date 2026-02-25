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
    getShiftById
} = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getProfiles);
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
router.patch('/:id', authMiddleware, roleMiddleware(['admin']), updateProfile);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteProfile);

module.exports = router;
