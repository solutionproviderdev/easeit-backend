const jwt = require('jsonwebtoken');

// Middleware to verify JWT from the authorization header
const checkLogin = async (req, res, next) => {
    try {
        // Check if the authorization header is present
        // const token = req.signedCookies[process.env.COOKIE_NAME]; // from cookie
        const authHeader = req.headers?.authorization; // from cookie

        if (!authHeader) {
            throw new Error('You must Log in before reading data');
        }

        // Extract the token from the Bearer token format
        const token = authHeader?.split(' ')[1];

        // Verify the JWT
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);

        // Store user's decoded data to req
        req.peopleName = decoded.name;
        req.peopleID = decoded.id;
        req.role = decoded.role;

        // Token is valid, proceed to the next middleware or route
        next();
    } catch (error) {
        // Handle errors during verification
        next(error.message);
    }
};

module.exports = { checkLogin };
