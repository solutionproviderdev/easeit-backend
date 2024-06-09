const jwt = require('jsonwebtoken');

exports.checkAuth = (req, res, next) => {
    const token = req.cookies.session_token;

    if (!token) {
        return res.status(401).json({ msg: 'You must login to read data.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
