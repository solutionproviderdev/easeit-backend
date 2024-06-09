// middleware/upload.js
const multer = require('multer');
const path = require('path');

// File storage configuration
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/files'); // Ensure 'public/files' directory exists
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Ensure 'public/images' directory exists
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const imageUpload = multer({ storage: imageStorage });
const fileUpload = multer({ storage: fileStorage });

module.exports = { upload: imageUpload, fileUpload };
