// controllers/uploadController.js
const path = require('path');

exports.uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No image uploaded' });
    }

    console.log(req.file);

    const fileUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
    res.status(200).json({ fileUrl });
};

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/files/${req.file.filename}`;
    res.status(200).json({ fileUrl });
};
