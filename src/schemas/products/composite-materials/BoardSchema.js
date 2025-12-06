const mongoose = require('mongoose');

const { Schema } = mongoose;

const BoardSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        baseMaterial: {
            type: Schema.Types.ObjectId,
            ref: 'BaseMaterial',
            required: true,
        },
        brand: {
            type: Schema.Types.ObjectId,
            ref: 'Brand',
            required: true,
        },
        surfaceFinish: {
            type: Schema.Types.ObjectId,
            ref: 'SurfaceFinish',
            required: true,
        },
        thickness: {
            type: Schema.Types.ObjectId,
            ref: 'Thickness',
            required: true,
        },
        unitPrice: {
            type: Number,
            min: [0, 'Unit price cannot be negative'],
        },
        sqftInSingleUnit: {
            type: Number,
            min: [0, 'Square feet value cannot be negative'],
        },
        sqftPrice: {
            type: Number,
            min: [0, 'Square feet price cannot be negative'],
        },
        image: {
            type: String,
            validate: {
                validator(v) {
                    if (!v) return true;
                    return /^(https?:\/\/|\/|\w:\\).+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
                },
                message: 'Invalid image URL or path format',
            },
        },
        description: {
            type: String,
            maxLength: [1000, 'Description cannot exceed 1000 characters'],
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
            default: 'sheet',
        },
        dimension: {
            height: {
                type: Number,
                min: [0, 'Height cannot be negative'],
            },
            width: {
                type: Number,
                min: [0, 'Width cannot be negative'],
            },
        },
        quantity: {
            type: Number,
            default: 0,
            min: [0, 'Quantity cannot be negative'],
        },
    },
    {
        id: true,
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Add indexes for frequently queried fields
BoardSchema.index({ name: 1 });
BoardSchema.index({ brand: 1 });
BoardSchema.index({ surfaceFinish: 1 });

// Combined population middleware for all referenced fields
BoardSchema.pre(/^find/, function (next) {
    this.populate([
        { path: 'baseMaterial', select: '-__v' },
        { path: 'brand', select: '-__v' },
        { path: 'surfaceFinish', select: '-__v' },
        { path: 'thickness', select: '-__v' },
    ]);
    next();
});

const Board = mongoose.model('Board', BoardSchema);
module.exports = Board;
