/* eslint-disable no-restricted-syntax */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../schemas/auth/UserSchema');
const ActivityLog = require('../../schemas/ActivityLogSchema');

// Create a new user
exports.createUser = async (req, res) => {
    try {
        const {
            nameAsPerNID,
            nickname,
            email,
            personalPhone,
            officePhone,
            gender,
            address,
            password,
            roleId,
            departmentId,
            accessLevel,
            currentSalary,
            workingProcedure,
            documents,
            socialLinks,
            guardian,
            type,
        } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        user = new User({
            nameAsPerNID,
            nickname,
            email,
            personalPhone,
            officePhone,
            gender,
            address,
            password: hashedPassword,
            roleId,
            departmentId,
            accessLevel,
            currentSalary,
            workingProcedure,
            documents,
            socialLinks,
            guardian,
            type,
        });

        // Save the user
        await user.save();

        // Remove the password from the response object
        const userResponse = user.toObject();
        delete userResponse.password;

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Created User',
            details: { email },
        });

        res.status(201).json(userResponse);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get all users function excluding sensitive properties
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get user by ID function excluding sensitive properties
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get user dropdown options with department and role filters
exports.getUserDropdownOptions = async (req, res) => {
    try {
        const { departmentId, roleId } = req.query;

        // Build the filter object based on query parameters
        const filter = {};
        if (departmentId) {
            filter.departmentId = departmentId;
        }
        if (roleId) {
            filter.roleId = roleId;
        }

        // Find users with the applied filters
        const users = await User.find(filter).select('nameAsPerNID nickname profilePicture _id');
        res.status(200).json(users);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update user profile picture function
exports.updateUserProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Assuming req.body.profilePicture contains the URL of the new profile picture
        user.profilePicture = req.body.profilePicture;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Updated Profile Picture',
            details: { profilePicture: user.profilePicture },
        });

        res.status(200).json({
            msg: 'Profile picture updated',
            profilePicture: user.profilePicture,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update user cover photo function
exports.updateUserCoverPhoto = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Assuming req.body.coverPhoto contains the URL of the new cover photo
        user.coverPhoto = req.body.coverPhoto;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Updated Cover Photo',
            details: { coverPhoto: user.coverPhoto },
        });

        res.status(200).json({ msg: 'Cover photo updated', coverPhoto: user.coverPhoto });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update user status function
exports.updateUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update status
        user.status = req.body.status;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Updated Status',
            details: { status: user.status },
        });

        res.status(200).json({ msg: 'User status updated', status: user.status });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Add user document function
exports.addUserDocument = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const { documentType, documentURL } = req.body;

        // Update user's documents
        user.documents[documentType] = documentURL;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Uploaded Document',
            details: { documentType, documentURL },
        });

        res.status(200).json({ msg: 'Document uploaded', documents: user.documents });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update user document function
exports.updateUserDocument = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const { documentType, documentURL } = req.body;

        // Update user's documents
        user.documents[documentType] = documentURL;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Updated Document',
            details: { documentType, documentURL },
        });

        res.status(200).json({ msg: 'Document updated', documents: user.documents });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update user password function with old password check
exports.updateUserPassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const { oldPassword, newPassword } = req.body;

        // Check if the old password is correct
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect old password' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Updated Password',
        });

        res.status(200).json({ msg: 'Password updated' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Admin update user password function without old password check
exports.adminUpdateUserPassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const { newPassword } = req.body;

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Admin Updated Password',
        });

        res.status(200).json({ msg: 'Password updated by admin' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update user details function
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const updateFields = {
            nameAsPerNID: req.body.nameAsPerNID,
            nickname: req.body.nickname,
            email: req.body.email,
            personalPhone: req.body.personalPhone,
            officePhone: req.body.officePhone,
            gender: req.body.gender,
            address: req.body.address,
            roleId: req.body.roleId,
            departmentId: req.body.departmentId,
            accessLevel: req.body.accessLevel,
            currentSalary: req.body.currentSalary,
            workingProcedure: req.body.workingProcedure,
            socialLinks: req.body.socialLinks,
            guardian: req.body.guardian,
            type: req.body.type, // Added type property
        };

        // Update user fields
        for (const [key, value] of Object.entries(updateFields)) {
            if (value !== undefined) {
                user[key] = value;
            }
        }

        await user.save();

        // Remove the password from the response object
        const userResponse = user.toObject();
        delete userResponse.password;

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Updated User',
            details: { userId: user._id },
        });

        res.status(200).json(userResponse);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Delete user function
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Delete the user
        await User.deleteOne({ _id: req.params.id });

        // Create an activity log entry
        await ActivityLog.create({
            userId: user._id,
            action: 'Deleted User',
            details: { userId: user._id },
        });

        res.status(200).json({ msg: 'User deleted' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Login User
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'No user found with this Email' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT
        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set cookie
        res.cookie('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
        });

        // Remove sensitive information before sending response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ user: userResponse, token });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Logout User
exports.logoutUser = async (req, res) => {
    res.cookie('session_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        expires: new Date(0), // Set expiration date to the past
    });
    res.status(200).json({ msg: 'Logged out successfully' });
};
