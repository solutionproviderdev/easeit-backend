const mongoose = require('mongoose');

const { Schema } = mongoose;

const GlassSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        thickness: {
            type: Schema.Types.ObjectId,
            ref: 'Thickness',
            required: true,
        },
        sqftPrice: {
            type: Number,
            required: true,
            min: [0, 'Square feet price cannot be negative'],
        },
        type: {
            type: String,
            required: true,
            trim: true,
        },
        color: {
            type: String,
            required: true,
            enum: ['red', 'clear', 'green', 'blue'],
            trim: true,
        },
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        unit: {
            type: String,
            required: true,
            default: 'sqft',
        },
    },
    {
        id: true,
        timestamps: true,
    }
);

// Add indexes for frequently queried fields
GlassSchema.index({ name: 1 });
GlassSchema.index({ type: 1 });
GlassSchema.index({ color: 1 });

// Population middleware for thickness reference
GlassSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'thickness',
        select: '-__v',
    });
    next();
});

const Glass = mongoose.model('Glass', GlassSchema);
module.exports = Glass;