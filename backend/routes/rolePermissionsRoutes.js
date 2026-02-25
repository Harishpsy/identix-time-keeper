const express = require('express');
const { getPermissions, getPermissionsByRole, updatePermission } = require('../controllers/rolePermissionsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// All authenticated users can read permissions (sidebar needs this)
router.get('/', authMiddleware, getPermissions);
router.get('/:role', authMiddleware, getPermissionsByRole);

// Only admin can update permissions
router.put('/', authMiddleware, roleMiddleware(['admin']), updatePermission);

module.exports = router;
