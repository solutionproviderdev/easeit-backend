const mongoose = require('mongoose');

const { Schema } = mongoose;

const materialDescriptionSchema = new Schema(
    {
        itemType: {
            type: String,
            required: true,
            enum: ['Board', 'Edging', 'Hardware', 'Surface'],
        },
        item: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'itemType',
        },
        usetext: {
            type: String,
        },
    },
    { id: true }
);

const configSchema = new Schema(
    {
        board: {
            type: Schema.Types.ObjectId,
            ref: 'Board',
            required: false,
            set: (value) => (value === '' ? null : value),
        },
        edging: {
            type: Schema.Types.ObjectId,
            ref: 'Edging',
            required: false,
            set: (value) => (value === '' ? null : value),
        },
        surface: {
            type: Schema.Types.ObjectId,
            ref: 'Surface',
            required: false,
            set: (value) => (value === '' ? null : value),
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
        hasHardware: {
            type: Boolean,
            required: false,
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
        materialDescriptions: [materialDescriptionSchema],
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
        { path: 'specifications.materialDescriptions.item', select: '-__v' },
    ]);
    next();
});

// Ensure dynamic refPath population for nested materialDescriptions
ProductSchema.post(/^find/, async (docs, next) => {
    try {
        const populatePath = 'specifications.materialDescriptions.item';
        const arr = [];
        if (Array.isArray(docs)) {
            arr.push(...docs);
        } else if (docs) {
            arr.push(docs);
        }
        await Promise.all(arr.map((doc) => doc.populate({ path: populatePath, select: '-__v' })));
    } catch (err) {
        // swallow populate errors to avoid breaking queries
    }
    next();
});

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
