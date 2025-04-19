const checkAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ msg: 'User not authenticated' });
        }

        if (req.user.type !== 'Admin') {
            return res.status(403).json({ msg: 'Access denied. Admin privileges required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ msg: 'Authorization check failed' });
    }
};

module.exports = { checkAdmin };
