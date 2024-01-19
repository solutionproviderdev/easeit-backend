const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    SKU: {
        type: String,
        required: true,
        unique: true,
    },
    class: {
        type: String,
        required: true,
        enum: ['Economy', 'Standard', 'Premium', 'Platinum'],
    },
    application: {
        type: String,
        required: true,
        enum: [
            'Kitchen Cabinet',
            'Front Shutter',
            'Storage cabinet',
            'Modular Cabinet',
            'Dinner Wagon',
            'Full Height cabinet / Open Shelve',
            'Bi-Fold Folding Door Works',
            'TV / Media Unit Works',
        ],
    },
    location: {
        type: String,
        required: true,
        enum: ['Inside', 'Outside'],
    },
    glass: String,
    frontSutterEdging: {
        type: String,
        required: true,
    },
    bodyBoard: {
        type: String,
        required: true,
    },
    fsBoard: {
        type: String,
        required: true,
    },
    bodyEdging: {
        type: String,
        required: true,
    },
    hardware: {
        type: String,
        required: true,
    },
    pushPull: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        require: true,
    },
});

const Product = mongoose.model('product', productSchema);

module.exports = Product;
