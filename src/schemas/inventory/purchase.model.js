/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const mongoose = require('mongoose');

const { Schema } = mongoose;

// Individual item in the purchase
const PurchaseItemSchema = new Schema({
    vendorMaterial: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor.materials',
        required: true,
    },
    material: {
        type: Schema.Types.ObjectId,
        refPath: 'materialType',
        required: true,
    },
    materialType: {
        type: String,
        required: true,
        enum: ['Board', 'Edging', 'Surface', 'Hardware'],
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    pricePerUnit: {
        type: Number,
        required: true,
        min: 0,
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
});

const PurchaseSchema = new Schema(
    {
        purchaseNumber: {
            type: String,
            required: true,
            unique: true,
        },
        vendor: {
            type: Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        items: [PurchaseItemSchema],
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['draft', 'ordered', 'received', 'cancelled'],
            default: 'draft',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'partially_paid', 'paid'],
            default: 'pending',
        },
        paymentDetails: [
            {
                amount: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                paymentDate: {
                    type: Date,
                    required: true,
                    default: Date.now,
                },
                paymentMethod: {
                    type: String,
                    required: true,
                    enum: ['cash', 'bank_transfer', 'check', 'other'],
                },
                reference: String,
                notes: String,
            },
        ],
        notes: String,
        attachments: [
            {
                name: {
                    type: String,
                    required: true,
                },
                url: {
                    type: String,
                    required: true,
                },
                type: {
                    type: String,
                    required: true,
                },
            },
        ],
        additionalCost: [
            // new field for additional costs
            {
                name: {
                    type: String,
                },
                amount: {
                    type: Number,
                    min: 0,
                },
            },
        ],
    },
    {
        timestamps: true,
        id: true,
    }
);

// Indexes for better query performance
PurchaseSchema.index({ purchaseNumber: 1 });
PurchaseSchema.index({ vendor: 1 });
PurchaseSchema.index({ status: 1 });
PurchaseSchema.index({ createdAt: -1 });
PurchaseSchema.index({ 'items.material': 1 });

// Populate middleware
PurchaseSchema.pre(/^find/, function (next) {
    this.populate([
        {
            path: 'vendor',
            select: 'name address contacts',
        },
        {
            path: 'items.material',
            select: 'name description',
        },
    ]);
    next();
});

// Auto-update status based on received quantities
PurchaseSchema.pre('save', function (next) {
    if (this.items.length === 0) {
        this.status = 'draft';
    } else if (this.receivedQuantity >= this.items.reduce((sum, item) => sum + item.quantity, 0)) {
        this.status = 'received';
    } else if (this.receivedQuantity > 0) {
        this.status = 'partially_received';
    }
    next();
});

const Purchase = mongoose.model('Purchase', PurchaseSchema);
module.exports = Purchase;
