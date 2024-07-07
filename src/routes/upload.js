// routes/uploadRoutes.js
const express = require('express');
const { upload, fileUpload } = require('../config/multerconfig');
const { uploadFile, uploadImage } = require('../controller/uploadController');

// const { uploadImage, uploadFile } = require('../controllers/uploadController');

const uploadRouter = express.Router();

// Image upload endpoint
uploadRouter.post('/image', upload.single('image'), uploadImage);

// File upload endpoint
uploadRouter.post('/file', fileUpload.single('file'), uploadFile);

module.exports = uploadRouter;
