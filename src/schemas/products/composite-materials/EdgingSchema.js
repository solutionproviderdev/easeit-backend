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
            enum: ['PVC', 'Acrylic', 'Aluminium', 'Melamine', 'Wood Veneer', 'ABS', 'Other'],
        },
        thickness: {
            type: Schema.Types.ObjectId, // Remove the nested type object
            ref: 'Thickness',
            required: true,
        },
        image: {
            type: String,
        },
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        unit: {
            type: String,
            required: true,
            default: 'meter',
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
