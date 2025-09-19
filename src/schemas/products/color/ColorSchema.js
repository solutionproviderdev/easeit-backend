const mongoose = require('mongoose');

const { Schema } = mongoose;

const prefabricated = new mongoose.Schema({
    spName: {
        type: String,
        required: true,
        trim: true,
    },
    brandName: {
        type: String,
        required: true,
        trim: true,
    },
    board: {
        type: Schema.Types.ObjectId,
        ref: 'Board',
        required: true,
    },
    spCode: {
        type: String,
        required: true,
        trim: true,
    },
    brandCode: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        validate: {
            validator(v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)$/i.test(v);
            },
            message: 'Invalid image URL format',
        },
    },
});

const formicaLaminated = new mongoose.Schema({
    spName: {
        type: String,
        required: true,
    },
    brandName: {
        type: String,
        required: true,
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
    },
    spCode: {
        type: String,
        required: true,
    },
    brandCode: {
        type: String,
        required: true,
    },
    formicaCategory: {
        category: {
            type: String,
            required: true,
        },
        subCategory: {
            type: String,
            required: true,
        },
    },
    pricePerSqFt: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
    },
    image: {
        type: String,
        validate: {
            validator(v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)$/i.test(v);
            },
            message: 'Invalid image URL format',
        },
    },
});

const paint = new mongoose.Schema({
    spName: {
        type: String,
        required: true,
    },
    brandName: {
        type: String,
        required: true,
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
    },
    paintBaseType: {
        type: String,
        required: true,
    },
    applicationArea: [
        {
            type: String,
            required: true,
        },
    ],
    pricePerSqFt: {
        fresh: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative'],
        },
        rePaint: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative'],
        },
    },
    image: {
        type: String,
        validate: {
            validator(v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)$/i.test(v);
            },
            message: 'Invalid image URL format',
        },
    },
});

const ColorSchema = new Schema(
    {
        type: {
            type: Schema.Types.ObjectId,
            ref: 'SurfaceFinish',
            required: true,
        },
        prefabricated,
        formicaLaminated,
        paint,
    },
    {
        id: true,
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Improved population middleware
ColorSchema.pre(/^find/, function (next) {
    this.populate([
        { path: 'type', select: '-__v' },
        { path: 'prefabricated.board', select: '-__v' },
        { path: 'formicaLaminated.brand', select: '-__v' },
        { path: 'paint.brand', select: '-__v' },
    ]);
    next();
});

// Add indexes for frequently queried fields
ColorSchema.index({ 'prefabricated.spCode': 1 });
ColorSchema.index({ 'formicaLaminated.spCode': 1 });
ColorSchema.index({ 'paint.paintBaseType': 1 });

const Color = mongoose.model('Color', ColorSchema);
module.exports = Color;
