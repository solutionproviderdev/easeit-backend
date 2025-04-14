const mongoose = require('mongoose');

const { Schema } = mongoose;

const BaseMaterialSchema = new Schema(
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

const BaseMaterial = mongoose.model('BaseMaterial', BaseMaterialSchema);
module.exports = BaseMaterial;
