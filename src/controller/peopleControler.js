const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const People = require('../schemas/PeopleSchema');

// Get all Peoples, optionally filtered by department
const getPeople = async (req, res) => {
    try {
        const query = {};

        // Check if a department filter is provided in the query parameters
        if (req.query.department) {
            query.department = req.query.department;
        }

        // Retrieve users from the database based on the query
        const allPeople = await People.find(query).select('-password').select('-startDate');

        return res.status(200).json(allPeople);
    } catch (err) {
        // Implement logger function if any
        return res.status(500).json({
            message: `${err.message}`,
        });
    }
};

// get user details
const getPeopleDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Retrieve user details from the database by ID
        const user = await People.findById(id).select('-password').select('-startDate');

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            message: 'User details retrieved successfully',
            user,
        });
    } catch (err) {
        // Implement logger function if any
        return res.status(500).json({
            message: `${err.message}`,
        });
    }
};

// Sign in or add user
const peopleSignup = async (req, res) => {
    try {
        // Get People from database with same name if any
        const validatePeopleemail = async (email) => {
            const people = await People.findOne({ email });
            return !people;
        };

        // Get People from database with same email if any
        const validateEmail = async (email) => {
            const people = await People.findOne({ email });
            return !people;
        };

        // Validate the name
        const nameNotTaken = await validatePeopleemail(req.body.email);
        if (!nameNotTaken) {
            return res.status(400).json({
                message: 'This email is already used.',
            });
        }

        // validate the email
        const emailNotRegistered = await validateEmail(req.body.email);
        if (!emailNotRegistered) {
            return res.status(400).json({
                message: 'Email is already registered.',
            });
        }

        // Handle file updates
        let avater;
        let nid;

        if (req.files) {
            // Assuming that 'avater' and 'nid' are the field names
            if (req.files.avater) {
                avater = `${process.env.SERVER_URL}/images/${req.files.avater[0].filename}`;
            }

            if (req.files.nid) {
                nid = `${process.env.SERVER_URL}/images/${req.files.nid[0].filename}`;
            }
        }

        // Hash password using bcrypt
        const password = await bcrypt.hash(req.body.password, 12);

        // create a new user
        const newPeople = new People({
            ...req.body,
            password,
            avater,
            nid,
        });

        await newPeople.save();
        return res.status(201).json({
            message: 'Hurry! now you are successfully registred. Please login.',
        });
    } catch (err) {
        // Implement logger function if any
        return res.status(500).json({
            message: `${err.message}`,
        });
    }
};

// Login
const peopleLogin = async (req, res) => {
    const { email, password } = req.body;

    // First Check if the user exist in the database
    const people = await People.findOne({ email });
    if (!people) {
        return res.status(404).json({
            message: 'No account found with this email. Invalid login credentials.',
            success: false,
        });
    }

    // That means the people is existing and trying to signin fro the right portal
    // Now check if the password match
    const isMatch = await bcrypt.compare(password, people.password);
    if (isMatch) {
        // if the password match Sign a the token and issue it to the people
        const token = jwt.sign(
            {
                name: people.name,
                id: people._id,
                role: people.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // Set Cookie
        res.cookie(process.env.COOKIE_NAME, token, {
            maxAge: process.env.JWT_EXPIRE,
            httpOnly: true,
            signed: true,
            // sameSite: 'None', // Set SameSite to None for cross-origin requests
            secure: true,
        });

        // Send Response
        const result = {
            user: people,
            token: `Bearer ${token}`,
            expiresIn: '1 day',
        };

        return res.status(200).json({
            ...result,
            message: 'You are now logged in.',
            success: true,
        });
    }
    return res.status(403).json({
        message: 'Incorrect password.',
        success: false,
    });
};

// Update User details
const updatePeopleDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Handle file updates
        if (req.files) {
            // Assuming that 'avater' and 'nid' are the field names
            if (req.files.avater) {
                updates.avater = `${process.env.SERVER_URL}/images/${req.files.avater[0].filename}`;
            }

            if (req.files.nid) {
                updates.nid = `${process.env.SERVER_URL}/images/${req.files.nid[0].filename}`;
            }
        }

        // Validate the updates if needed

        // Update the user details in the database
        const updatedPeople = await People.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedPeople) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            message: 'User details updated successfully',
            updatedPeople,
        });
    } catch (err) {
        // Implement logger function if any
        return res.status(500).json({
            message: `${err.message}`,
        });
    }
};

// Get names and ids of all people
const getPeopleNamesAndIds = async (req, res) => {
    try {
        const people = await People.find({}).select('name _id');
        return res.status(200).json(people);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// do logout
function peopleLogout(req, res) {
    res.clearCookie(process.env.COOKIE_NAME);
    res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = {
    peopleSignup,
    getPeople,
    peopleLogin,
    peopleLogout,
    getPeopleDetails,
    updatePeopleDetails,
    getPeopleNamesAndIds,
};
