const mongoose = require('mongoose');

const { Schema } = mongoose;

const HardwareItemsSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        unit: {
            type: String,
            required: [true, 'Unit is required'],
            trim: true,
            enum: {
                values: ['piece', 'pair', 'set', 'dozen'],
                message: '{VALUE} is not a valid unit',
            },
        },
        useQuantityPerSqFt: {
            type: Number,
            required: [true, 'Usage quantity per square feet is required'],
            min: [0, 'Quantity cannot be negative'],
            validate: {
                validator: Number.isFinite,
                message: 'Quantity must be a valid number',
            },
        },
        useScrew: {
            type: Boolean,
            required: [true, 'Screw usage information is required'],
        },
        screwSize: {
            type: String,
            trim: true,
            required() {
                return this.useScrew === true;
            },
            validate: {
                validator(v) {
                    return !this.useScrew || (v && v.length > 0);
                },
                message: 'Screw size is required when useScrew is true',
            },
        },
        screwQuantity: {
            type: Number,
            required() {
                return this.useScrew === true;
            },
            min: [1, 'Screw quantity must be at least 1'],
            validate: {
                validator(v) {
                    return !this.useScrew || (Number.isInteger(v) && v > 0);
                },
                message: 'Screw quantity must be a positive integer when useScrew is true',
            },
        },
        active: {
            type: Boolean,
            required: true,
            default: true,
        },
        unitPrice: {
            type: Number,
            required: [true, 'Unit price is required'],
            min: [0, 'Unit price cannot be negative'],
            validate: {
                validator: Number.isFinite,
                message: 'Unit price must be a valid number',
            },
        },
        useTypes: {
            type: [String],
            required: [true, 'Usage type is required'],
            enum: {
                values: ['cabinet', 'drawer', 'shelve', 'glass', 'depreciation'],
                message: '{VALUE} is not a valid usage type',
            },
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        minStockLevel: {
            type: Number,
            default: 0,
            min: [0, 'Minimum stock level cannot be negative'],
        },
        currentStock: {
            type: Number,
            default: 0,
            min: [0, 'Current stock cannot be negative'],
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: null,
            validate: {
                validator(v) {
                    if (!v) return true;
                    if (typeof v !== 'object') return false;
                    if (Array.isArray(v)) return false;
                    return true;
                },
                message: 'Metadata must be a valid object',
            },
        },
    },
    {
        id: true,
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Add indexes for frequently queried fields
HardwareItemsSchema.index({ name: 1 });
HardwareItemsSchema.index({ useTypes: 1 });
HardwareItemsSchema.index({ active: 1 });
HardwareItemsSchema.index({ unitPrice: 1 });
HardwareItemsSchema.index({ currentStock: 1 });

// Virtual for stock status
HardwareItemsSchema.virtual('stockStatus').get(function () {
    if (this.currentStock <= this.minStockLevel) {
        return 'low';
    }
    return 'adequate';
});

// Pre-save middleware to validate screw-related fields
HardwareItemsSchema.pre('save', function (next) {
    if (this.useScrew && (!this.screwSize || !this.screwQuantity)) {
        next(new Error('Screw size and quantity are required when useScrew is true'));
    }
    next();
});

// Method to check if item needs restock
HardwareItemsSchema.methods.needsRestock = function () {
    return this.currentStock <= this.minStockLevel;
};

// Static method to find low stock items
HardwareItemsSchema.statics.findLowStock = function () {
    return this.find({
        $expr: {
            $lte: ['$currentStock', '$minStockLevel'],
        },
    });
};

const HardwareItems = mongoose.model('HardwareItems', HardwareItemsSchema);
module.exports = HardwareItems;
