const mongoose = require('mongoose');

const { Schema } = mongoose;

// Schema for contact person information
const contactSchema = new Schema({
    // Full name of the contact person
    name: {
        type: String,
        required: true,
        trim: true,
    },
    // Contact person's phone number (mobile/landline)
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    // Role or position in the vendor company
    designation: {
        type: String,
        trim: true,
    },
    // URL or path to the contact person's visiting card image
    visitingCardImage: {
        type: String,
    },
    // Indicates if this is the primary contact person
    isPrimary: {
        type: Boolean,
        default: false,
    },
});

// Schema for materials supplied by the vendor
const materialSchema = new Schema({
    // Type of material (Board/Edging/Surface/Hardware)
    type: {
        type: String,
        required: true,
        enum: ['Board', 'Edging', 'Surface', 'Hardware'],
        index: true,
    },
    // Reference to the actual material document based on type
    material: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'materials.type',
        index: true,
    },
    // Vendor's unique code/SKU for this material
    vendorCode: {
        type: String,
        trim: true,
        index: true,
    },
    // Current unit price offered by vendor
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    // Unit of measurement (kg, m, liter, piece, etc.)
    unit: {
        type: String,
        required: true,
        trim: true,
    },
    // Minimum quantity vendor accepts for order
    minOrderQuantity: {
        type: Number,
        default: 1,
        min: 1,
    },
    // Expected delivery time in days
    leadTime: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Whether this material is currently available from vendor
    isActive: {
        type: Boolean,
        default: true,
    },
    // Date of most recent purchase
    lastPurchaseDate: {
        type: Date,
    },
    // Price from most recent purchase
    lastPurchasePrice: {
        type: Number,
        min: 0,
    },
});

// Main vendor schema
const VendorSchema = new Schema(
    {
        // Company/Business name of the vendor
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        // Complete address details
        address: {
            type: String,
            required: true,
            trim: true,
        },
        // Whether vendor is currently active for business
        active: {
            type: Boolean,
            default: true,
            index: true,
        },
        // Date of most recent purchase from this vendor
        lastPurchaseDate: {
            type: Date,
            default: null,
            index: true,
        },
        // Array of contact persons
        contacts: [contactSchema],
        // Array of materials supplied by vendor
        materials: [materialSchema],
        // Vendor performance rating (0-5)
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        // URL or path to the vendor's logo
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
    },
    {
        id: true,
        timestamps: true,
    }
);

// Compound indexes for better query performance
VendorSchema.index({ 'materials.type': 1, 'materials.material': 1 });
VendorSchema.index({ 'materials.vendorCode': 1, name: 1 });
VendorSchema.index({ active: 1, lastPurchaseDate: -1 });

// Population middleware
VendorSchema.pre(/^find/, function (next) {
    this.populate([
        {
            path: 'materials.material',
            select: 'name description image -__v',
            match: { 'materials.isActive': true },
        },
    ]);
    next();
});

const Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
