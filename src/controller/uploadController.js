const path = require('path');

exports.uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No image uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}${
        process.env.ENVIRONMENT === 'development' ? '' : '/api'
    }/images/${req.file.filename}`;
    res.status(200).json({ fileUrl });
};

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}${
        process.env.ENVIRONMENT === 'development' ? '' : '/api'
    }/files/${req.file.filename}`;
    res.status(200).json({ fileUrl });
};

exports.uploadMultipleImages = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ msg: 'No images uploaded' });
    }

    const fileUrls = req.files.map(
        (file) => `${req.protocol}://${req.get('host')}${
                process.env.ENVIRONMENT === 'development' ? '' : '/api'
            }/images/${file.filename}`
    );
    res.status(200).json({ fileUrls });
};

exports.uploadMultipleFiles = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ msg: 'No files uploaded' });
    }

    const fileUrls = req.files.map(
        (file) => `${req.protocol}://${req.get('host')}${
                process.env.ENVIRONMENT === 'development' ? '' : '/api'
            }/files/${file.filename}`
    );
    res.status(200).json({ fileUrls });
};
