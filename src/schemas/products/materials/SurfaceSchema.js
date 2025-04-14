const mongoose = require('mongoose');

const { Schema } = mongoose;

const SurfaceSchema = new Schema(
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

const Surface = mongoose.model('Surface', SurfaceSchema);
module.exports = Surface;
