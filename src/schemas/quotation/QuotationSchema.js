const mongoose = require('mongoose');

const { Schema } = mongoose;

// Schema for contact person information
const prodctSection = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    height: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
    width: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
    depth: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
    sqft: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
    type: [
        {
            type: String,
        },
    ],
    surface: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Surface',
        required: true,
        index: true,
    },
    color: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Color',
        required: true,
        index: true,
    },
    price: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
        default: 'draft',
    },
    validUntil: {
        type: Date,
        required: true,
        default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
    },
});

// Schema for materials supplied by the vendor
const cartItem = new Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    serise: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        trim: true,
        index: true,
    },
    sections: [prodctSection],
    quantity: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
    totalPrice: {
        type: Number,
        required: true,
        trim: true,
        index: true,
    },
});

// Main vendor schema
const QuotationSchema = new Schema(
    {
        items: [cartItem],
        totalPrice: {
            type: Number,
            required: true,
            min: [0, 'Total price cannot be negative'],
            validate: {
                validator(v) {
                    return this.items.reduce((sum, item) => sum + item.totalPrice, 0) === v;
                },
                message: 'Total price must match sum of item prices',
            },
        },
        transportation: {
            type: Number, // Changed from String to Number
            required: true,
            min: [0, 'Transportation cost cannot be negative'],
        },
        discount: {
            type: Number,
            required: true,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%'],
        },
        finalPrice: {
            type: Number,
            required: true,
            min: [0, 'Final price cannot be negative'],
            validate: {
                validator(v) {
                    const subtotal = this.totalPrice + this.transportation;
                    const discountAmount = subtotal * (this.discount / 100);
                    return Math.round(subtotal - discountAmount) === Math.round(v);
                },
                message: 'Final price must match calculation',
            },
        },
    },
    {
        id: true,
        timestamps: true,
    }
);

// Compound indexes for better query performance
// Add meaningful indexes
QuotationSchema.index({ createdAt: -1 });
QuotationSchema.index({ 'items.product': 1 });
QuotationSchema.index({ 'items.serise': 1 });
QuotationSchema.index({ finalPrice: 1 });

// Population middleware
QuotationSchema.pre(/^find/, function (next) {
    this.populate([
        {
            path: 'items.product',
            select: 'name specifications thumbnail',
        },
        {
            path: 'items.serise',
            select: 'name description',
        },
        {
            path: 'items.sections.surface',
            select: 'name',
        },
        {
            path: 'items.sections.color',
            select: 'prefabricated formicaLaminated paint',
        },
    ]);
    next();
});

const Quotation = mongoose.model('Quotation', QuotationSchema);
module.exports = Quotation;
