const Product = require('../schemas/products/ProductSchema');

// Create
async function createProduct(data) {
    const product = new Product(data);
    await product.save();
    // Re-fetch to trigger query middleware population (pre /^find/)
    const populated = await Product.findById(product._id);
    return populated || product;
}

// Read - list with filters, sorting, pagination
async function getAllProducts(params = {}) {
    const { search, series, minPrice, maxPrice, status, sort, limit = 100, page = 1 } = params;

    const query = {};

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    if (series) {
        query['specifications.series'] = series;
    }

    if (minPrice || maxPrice) {
        query['specifications.pricePerSqFt'] = {};
        if (minPrice) query['specifications.pricePerSqFt'].$gte = parseFloat(minPrice);
        if (maxPrice) query['specifications.pricePerSqFt'].$lte = parseFloat(maxPrice);
    }

    if (status) {
        query.productStatus = status;
    }

    const products = await Product.find(query)
        .sort(sort || { createdAt: -1 })
        .limit(parseInt(limit, 10) || 100)
        .skip(parseInt(page, 10) ? (parseInt(page, 10) - 1) * parseInt(limit || 10, 10) : 0);

    return products;
}

// Read - by ID
async function getProductById(id) {
    const product = await Product.findById(id);
    return product;
}

// Update - by ID
async function updateProduct(id, data) {
    const product = await Product.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
    return product;
}

// Delete - by ID
async function deleteProduct(id) {
    const product = await Product.findByIdAndDelete(id);
    return product;
}

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
};
