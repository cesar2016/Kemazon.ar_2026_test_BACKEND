const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    let token = req.header('x-auth-token');

    // Check for Authorization header if x-auth-token is not present
    if (!token && req.header('Authorization')) {
        const authHeader = req.header('Authorization');
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7, authHeader.length);
        }
    }

    // Debug log
    console.log('Auth Middleware - Token received:', token ? 'Yes' : 'No');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Auth Middleware - Decoded User:', decoded.user);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports.verifyAdmin = function (req, res, next) {
    // Must be called AFTER verifyToken (auth middleware)
    if (!req.user) {
        return res.status(401).json({ msg: 'Unauthorized: No user found' });
    }

    // Check if role is 1 (Admin)
    if (req.user.roleId !== 1) {
        return res.status(403).json({ msg: 'Access denied: Admin privileges required' });
    }

    next();
};
