// routes/userRoutes.js
const express = require('express');
// eslint-disable-next-line import/no-extraneous-dependencies
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const {
    createUser,
    getAllUsers,
    getUserById,
    getUserDropdownOptions,
    updateUser,
    deleteUser,
    updateUserStatus,
    updateUserPassword,
    updateUserProfilePicture,
    updateUserCoverPhoto,
    loginUser,
    logoutUser,
    addUserDocument,
    updateUserDocument,
    adminUpdateUserPassword,
} = require('../../controller/auth/userController');

const {
    validateUser,
    validateURL,
    validateStatus,
    validateDocument,
    validateAdminPasswordChange,
    validateUserPasswordChange,
    validateUserUpdate,
} = require('../../validators/authValidators');
const { checkAuth } = require('../../middlewares/auth/checkAuth');
const activityLogRouter = require('./activityLog');
const departmentRouter = require('./department');
const deviceTokenRouter = require('./deviceToken');

// Router Declaration
const userRouter = express.Router();

userRouter.use('/activity-logs', activityLogRouter);
userRouter.use('/departments', departmentRouter);
userRouter.use('/device-token', deviceTokenRouter);

// Get All Users
userRouter.get('/', getAllUsers);

// Get Single User
userRouter.get('/:id', checkAuth, getUserById);

// Get User Dropdown Options with Filters
userRouter.get('/dropdown/options', checkAuth, getUserDropdownOptions);

// Create a New User
userRouter.post('/', validateUser, createUser);

// Update User Details
userRouter.put('/:id', checkAuth, validateUserUpdate, updateUser);

// Delete a User
userRouter.delete('/:id', checkAuth, deleteUser);

// Update User Status
userRouter.patch('/:id/status', checkAuth, validateStatus, updateUserStatus);

// Update User Password with Password Validator
userRouter.patch('/:id/password', checkAuth, validateUserPasswordChange, updateUserPassword);

// Admin Update User Password with Password Validator
userRouter.patch(
    '/admin/:id/password',
    checkAuth,
    validateAdminPasswordChange,
    adminUpdateUserPassword
);

// Update User Profile Picture with URL Validator
userRouter.patch(
    '/:id/profile-picture',
    checkAuth,
    validateURL('profilePicture'),
    updateUserProfilePicture
);

// Update User Cover Photo with URL Validator
userRouter.patch('/:id/cover-photo', checkAuth, validateURL('coverPhoto'), updateUserCoverPhoto);

// Login User
userRouter.post('/login', loginUser);

// Logout User
userRouter.post('/logout', checkAuth, logoutUser);

// Upload User Document
userRouter.post('/:id/documents', checkAuth, validateDocument, addUserDocument);

// Update User Document
userRouter.put('/:id/documents/:documentId', checkAuth, validateDocument, updateUserDocument);

// Export Router
module.exports = userRouter;
