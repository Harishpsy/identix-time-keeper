const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Forbidden: No role assigned' });
        }

        const userRole = req.user.role;

        // Super admin always has access to everything
        if (userRole === 'super_admin') {
            return next();
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

module.exports = roleMiddleware;
