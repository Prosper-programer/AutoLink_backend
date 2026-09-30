const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user and req.user.role should be set by the requireAuth middleware
    if (!req.user || !Array.isArray(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if the user's role array contains at least one of the allowed roles
    const hasRole = req.user.role.some(userRole => allowedRoles.includes(userRole));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    next();
  };
};

module.exports = {
  requireRole
};
