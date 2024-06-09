const express = require('express');

// Internal Imports
const {
    peopleSignup,
    peopleLogin,
    peopleLogout,
    updatePeopleDetails,
    getPeopleDetails,
    getPeople,
    getPeopleNamesAndIds,
} = require('../controller/peopleControler');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const { upload } = require('../config/multerconfig');

// Router Declearation
const peopleRouter = express.Router();

// Get All Users
peopleRouter.get('/', checkLogin, getPeople);

// New route to get names and ids
peopleRouter.get('/names-id', checkLogin, getPeopleNamesAndIds);

// Get single User Details
peopleRouter.get('/:id', checkLogin, getPeopleDetails);

// Signup or add new User
peopleRouter.post(
    '/signup',
    // checkLogin,
    upload.fields([
        { name: 'avater', maxCount: 1 },
        { name: 'nid', maxCount: 1 },
    ]),
    peopleSignup
);

// Log in
peopleRouter.post('/login', peopleLogin);

// Update profile Details
peopleRouter.put(
    '/:id',
    checkLogin,
    upload.fields([
        { name: 'avater', maxCount: 1 },
        { name: 'nid', maxCount: 1 },
    ]),
    updatePeopleDetails
);

// Log out
peopleRouter.delete('/logout', checkLogin, peopleLogout);

module.exports = peopleRouter;
