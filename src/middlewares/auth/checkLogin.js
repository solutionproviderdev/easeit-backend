const jwt = require('jsonwebtoken');
const People = require('../../schemas/PeopleSchema');

const checkLogin = async (req, res, next) => {
    try {
        // const cookietoken = req.headers.cookie;
        // console.log(cookietoken);

        const authHeader = req.headers?.authorization;
        if (!authHeader) {
            throw new Error('You must Log in before reading data');
        }
        const token = authHeader?.split(' ')[1];
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);

        console.log(decoded);

        // Find the user based on decoded data
        const user = await People.findById(decoded.id);
        if (!user) {
            throw new Error('User not found');
        }

        // Set the user object in req
        req.user = user;
        // Store user's decoded data to req
        req.peopleName = decoded.name;
        req.peopleID = decoded.id;
        req.role = decoded.role;

        next();
    } catch (error) {
        next(error.message);
    }
};

module.exports = { checkLogin };
