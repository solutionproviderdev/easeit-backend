const mongoose = require('mongoose');

const adImageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        project: { type: String }, // Optional project/location details
        sqft: { type: Number }, // Optional area information
        budget: { type: Number }, // Optional budget information
    },
    { _id: false } // No individual _id for each image
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
