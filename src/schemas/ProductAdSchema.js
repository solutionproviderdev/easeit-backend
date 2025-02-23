const mongoose = require('mongoose');

const adImageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        project: { type: String },
        sqft: { type: Number },
        budget: { type: Number },
        pageId: { type: String }, // New field for the pageId
    },
    { _id: true }
);

const productAdSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true, // Enforce unique product names
            trim: true,
        },
        images: [adImageSchema],
        description: { type: String },
        tags: [{ type: String }],
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
);
const ProductAd = mongoose.model('ProductAd', productAdSchema);

module.exports = ProductAd;
