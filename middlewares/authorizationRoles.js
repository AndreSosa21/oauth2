// middlewares/AuthorizationRoles.js
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user && req.user.role;
    if (!userRole) return res.status(401).json({ message: 'Missing user role' });

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied: Unauthorized role' });
    }
    next();
  };
}

module.exports = authorizeRoles;