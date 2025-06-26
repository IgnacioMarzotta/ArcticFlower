const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.permissions === 1) {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied. Admin permissions required.' });
        }

    } catch (error) {
        console.error("[isAdmin Middleware] Error:", error);
        return res.status(500).json({ message: 'Internal server error while verifying user permissions.' });
    }
};

module.exports = isAdmin;