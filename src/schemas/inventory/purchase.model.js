/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const mongoose = require('mongoose');

const { Schema } = mongoose;

// Individual item in the purchase
const PurchaseItemSchema = new Schema({
    // Reference to vendor's material
    vendorMaterial: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor.materials',
        required: true,
    },
    // Actual material reference (Board/Edging/Surface/Hardware)
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
    unit: {
        type: String,
        required: true,
        trim: true,
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
    receivedQuantity: {
        type: Number,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'partially_received', 'received', 'cancelled'],
        default: 'pending',
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
            enum: ['draft', 'ordered', 'partially_received', 'completed', 'cancelled'],
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
        expectedDeliveryDate: {
            type: Date,
        },
        deliveryAddress: {
            type: String,
            required: true,
        },
        notes: String,
        attachments: [
            {
                // _id: false, // Disable _id generation for custom attachment
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
    } else {
        const allReceived = this.items.every((item) => item.quantity === item.receivedQuantity);
        const someReceived = this.items.some((item) => item.receivedQuantity > 0);

        if (allReceived) {
            this.status = 'completed';
        } else if (someReceived) {
            this.status = 'partially_received';
        }
    }
    next();
});

// Add after other middlewares
PurchaseSchema.post('save', async (doc) => {
    if (doc.status === 'completed' || doc.status === 'partially_received') {
        for (const item of doc.items) {
            if (item.receivedQuantity > 0) {
                const MaterialModel = mongoose.model(item.materialType);
                await MaterialModel.findByIdAndUpdate(
                    item.material,
                    { $inc: { stock: item.receivedQuantity } },
                    { new: true }
                );
            }
        }
    }
});

const Purchase = mongoose.model('Purchase', PurchaseSchema);
module.exports = Purchase;
