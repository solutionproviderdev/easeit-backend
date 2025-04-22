const mongoose = require('mongoose');

const { Schema } = mongoose;

// Schema for contact person information
const productSection = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    dimensions: {
        height: {
            type: Number,
            required: true,
            min: [0, 'Height cannot be negative'],
        },
        width: {
            type: Number,
            required: true,
            min: [0, 'Width cannot be negative'],
        },
        depth: {
            type: Number,
            required: true,
            min: [0, 'Depth cannot be negative'],
        },
    },
    sqft: {
        type: Number,
        required: true,
        min: [0, 'Square feet cannot be negative'],
        validate: {
            validator(v) {
                const calculatedSqft = (this.dimensions.height * this.dimensions.width) / 144;
                return Math.abs(calculatedSqft - v) < 0.01;
            },
            message: 'Square feet must match calculated dimensions',
        },
    },
    type: [
        {
            type: String,
            required: true,
        },
    ],
    surface: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Surface',
        required: true,
    },
    color: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Color',
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
    },
});

const quotationItem = new Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    series: {
        // Fixed typo from 'serise'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Series', // Add proper reference
        required: true,
    },
    sections: [productSection],
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
    },
    totalPrice: {
        type: Number,
        required: true,
        validate: {
            validator(v) {
                const sectionTotal = this.sections.reduce((sum, section) => sum + section.price, 0);
                return sectionTotal * this.quantity === v;
            },
            message: 'Total price must match sum of section prices multiplied by quantity',
        },
    },
});

// Main vendor schema
const QuotationSchema = new Schema(
    {
        items: [quotationItem],
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
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
        notes: String,
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
