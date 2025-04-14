const mongoose = require('mongoose');

const { Schema } = mongoose;

const EdgingSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        catagory: {
            type: String,
            required: true,
            enum: [],
        },
        thickness: {
            type: { type: Schema.Types.ObjectId, ref: 'Thickness' },
            required: true,
        },
        image: {
            type: String,
        },
    },
    { id: true }
);

function populateThickness(next) {
    this.populate({
        path: 'thickness',
        select: '-__v', // Exclude version key if desired
    });
    next(); // Call the next middleware
}

// Apply to all find operations
EdgingSchema.pre(/^find/, populateThickness);

const Edging = mongoose.model('Edging', EdgingSchema);
module.exports = Edging;
