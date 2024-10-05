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
const { checkAuth } = require('../../middlewares/auth/checkLoginCookie');
const Department = require('../../schemas/auth/DepartmentSchema');
const User = require('../../schemas/auth/UserSchema');
const activityLogRouter = require('./activityLog');
const departmentRouter = require('./department');

// Router Declaration
const userRouter = express.Router();

userRouter.use('/activity-logs', activityLogRouter);
userRouter.use('/departments', departmentRouter);

// Get All Users
userRouter.get('/', getAllUsers);

// Get Single User
userRouter.get('/:id', checkAuth, getUserById);

// Get User Dropdown Options with Filters
userRouter.get('/dropdown/options', checkAuth, getUserDropdownOptions);

// Create a New User
userRouter.post('/', createUser);//checkAuth, validateUser,

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

// Function to create dummy departments, roles, and users
const createDummyData = async () => {
    try {
        // Create dummy departments
        const departments = [
            {
                departmentName: 'CRE',
                description: 'CRE Department',
                roles: [
                    {
                        roleName: 'CRE Head',
                        description: 'Team Leader of CRE Team',
                        permissions: [
                            { resource: 'leads', action: 'create' },
                            { resource: 'leads', action: 'update' },
                            { resource: 'leads', action: 'delete' },
                        ],
                    },
                    {
                        roleName: 'CRE',
                        description: 'Handles Leads',
                        permissions: [
                            { resource: 'leads', action: 'create' },
                            { resource: 'leads', action: 'update' },
                        ],
                    },
                ],
            },
        ];

        const createdDepartments = await Department.insertMany(departments);

        // Create dummy users
        for (let i = 0; i < 10; i++) {
            const department = faker.helpers.arrayElement(createdDepartments);
            const role = faker.helpers.arrayElement(department.roles);
            const password = await bcrypt.hash('password', 10);

            const user = new User({
                nameAsPerNID: `${faker.person.firstName()} ${faker.person.lastName()}`,
                nickname: faker.internet.userName(),
                email: faker.internet.email(),
                personalPhone: faker.phone.number(),
                officePhone: faker.phone.number(),
                gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
                address: faker.location.streetAddress(),
                profilePicture: faker.image.avatar(),
                coverPhoto: faker.image.url(),
                password,
                status: faker.helpers.arrayElement(['Active', 'Inactive']),
                roleId: role._id,
                departmentId: department._id,
                type: faker.helpers.arrayElement(['Admin', 'Operator']),
                accessLevel: faker.helpers.arrayElements(['read', 'write', 'delete'], 2),
                joiningDate: faker.date.past(),
                currentSalary: faker.finance.amount(),
                workingProcedure: faker.lorem.sentence(),
                documents: {
                    resume: faker.internet.url(),
                    nidCopy: faker.internet.url(),
                    academicDocument: faker.internet.url(),
                    bankAccountNumber: faker.finance.accountNumber(),
                    agreement: faker.internet.url(),
                },
                activityLog: [
                    {
                        activity: faker.lorem.sentence(),
                    },
                ],
                socialLinks: [
                    {
                        platform: 'Facebook',
                        link: faker.internet.url(),
                    },
                ],
                guardian: {
                    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
                    phone: faker.phone.number(),
                    relation: faker.helpers.arrayElement(['Father', 'Mother', 'Guardian']),
                },
            });

            await user.save();
        }

        console.log('Dummy data created successfully!');
    } catch (error) {
        console.error('Error creating dummy data:', error);
    }
};

// createDummyData();

// Export Router
module.exports = userRouter;
