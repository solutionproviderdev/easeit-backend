const mongoose = require('mongoose');

// Create a schema for the Product
const meterialsSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: [0, 'Quantity cannot be less than 0'],
    },
    skuCode: {
        type: String,
        required: true,
        unique: true,
    },
    color: {
        type: String,
        required: true,
    },
});

// Compile the schema into a model
const Meterials = mongoose.model('meterials', meterialsSchema);

// Export the model
module.exports = Meterials;
