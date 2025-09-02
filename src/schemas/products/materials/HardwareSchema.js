const mongoose = require('mongoose');

const { Schema } = mongoose;

const HardwareSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        image: {
            type: String,
        },
    },
    { id: true }
);

const Hardware = mongoose.model('Hardware', HardwareSchema);
module.exports = Hardware;
