const mongoose = require('mongoose');

const { Schema } = mongoose;

const configSchema = new Schema(
    {
        board: {
            type: Schema.Types.ObjectId,
            ref: 'Board',
            required: true,
        },
        edging: {
            type: Schema.Types.ObjectId,
            ref: 'Edging',
            required: true,
        },
        surface: {
            type: Schema.Types.ObjectId,
            ref: 'Surface',
            required: true,
        },
    },
    { id: true }
);

const seriesSpecificationSchema = new Schema(
    {
        series: {
            type: Schema.Types.ObjectId,
            ref: 'Series',
            required: true,
        },
        surface: {
            type: Schema.Types.ObjectId,
            ref: 'Surface',
            required: true,
        },
        configs: {
            front: {
                type: configSchema,
            },
            bodyStructure: {
                type: configSchema,
            },
        },
        hasFront: {
            type: Boolean,
            required: true,
        },
        hasBodyStructure: {
            type: Boolean,
            required: true,
        },
        hardware: {
            type: Schema.Types.ObjectId,
            ref: 'Hardware',
            required: true,
        },
        durability: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
        waterResistant: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
        scratchResistant: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
        screwHoldingCapacity: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
        warranty: {
            type: Number,
            required: true,
            min: 0,
        },
        pricePerSqFt: {
            type: Number,
            required: true,
            min: 0,
        },
        images: {
            type: [String],
        },
    },
    { id: true }
);

const ProductSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        specifications: [seriesSpecificationSchema],
        thumbnail: {
            type: String,
        },
        productStatus: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        id: true,
        timestamps: true,
    }
);

ProductSchema.index({ name: 1 });
ProductSchema.index({ 'specifications.series': 1 });
ProductSchema.index({ 'specifications.pricePerSqFt': 1 });

// Add population middleware
ProductSchema.pre(/^find/, function (next) {
    this.populate([
        { path: 'specifications.series', select: '-__v' },
        { path: 'specifications.surface', select: '-__v' },
        { path: 'specifications.hardware', select: '-__v' },
        { path: 'specifications.configs.front.board', select: '-__v' },
        { path: 'specifications.configs.front.edging', select: '-__v' },
        { path: 'specifications.configs.front.surface', select: '-__v' },
        { path: 'specifications.configs.bodyStructure.board', select: '-__v' },
        { path: 'specifications.configs.bodyStructure.edging', select: '-__v' },
        { path: 'specifications.configs.bodyStructure.surface', select: '-__v' },
    ]);
    next();
});

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
