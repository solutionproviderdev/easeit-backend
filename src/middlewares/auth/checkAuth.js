const jwt = require('jsonwebtoken');
const User = require('../../schemas/auth/UserSchema');

const checkAuth = async (req, res, next) => {
    try {
        // Check for token in Authorization header (Bearer token)
        const authHeader = req.headers?.authorization;
        if (!authHeader) {
            return res.status(401).json({ msg: 'Authorization header is missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ msg: 'Authorization token is missing' });
        }

        // Decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user based on the decoded token data
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Attach the user document to req.user
        req.user = user;

        // Call the next middleware
        next();
    } catch (error) {
        // console.error('Authorization error:', error);
        res.status(401).json({ msg: 'Invalid token or user authentication failed' });
    }
};

module.exports = { checkAuth };
