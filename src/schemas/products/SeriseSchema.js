const mongoose = require('mongoose');

const { Schema } = mongoose;

const SeriseSchema = new Schema(
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

const Serise = mongoose.model('Serise', SeriseSchema);
module.exports = Serise;
