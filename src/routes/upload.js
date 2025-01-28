const express = require('express');
const { upload, fileUpload } = require('../config/multerconfig');
const {
    uploadFile,
    uploadImage,
    uploadMultipleImages,
    uploadMultipleFiles,
} = require('../controller/uploadController');

const uploadRouter = express.Router();

// Image upload endpoint
uploadRouter.post('/image', upload.single('image'), uploadImage);

// File upload endpoint
uploadRouter.post('/file', fileUpload.single('file'), uploadFile);

// Multiple images upload endpoint
uploadRouter.post('/images', upload.array('images', 10), uploadMultipleImages);

// Multiple files upload endpoint
uploadRouter.post('/files', fileUpload.array('files', 10), uploadMultipleFiles);

module.exports = uploadRouter;
