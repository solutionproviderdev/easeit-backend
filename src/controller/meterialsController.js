/* eslint-disable prettier/prettier */
const Meterials = require('../schemas/MeterialsSchema');

// Add a new product
const addMeterials = async (req, res) => {
    try {
        // Extract product details from request body
        const {
            category,
            name,
            brand,
            quantity,
            skuCode,
            color
        } = req.body;

        // Create a new product instance
        const product = new Meterials({
            category,
            name,
            brand,
            quantity,
            skuCode,
            color
        });

        // Save the product to the database
        const savedProduct = await product.save();

        // Respond with success message and saved product data
        return res.status(201).json({
            message: 'Product added successfully',
            product: savedProduct,
        });
    } catch (error) {
        console.error(error); // Implement logger function if any
        return res.status(500).json({
            message: `Error adding product: ${error.message}`,
        });
    }
};

// Add multiple materials
const addMultipleMaterials = async (req, res) => {
    try {
        // Expecting an array of material objects in the request body
        const { materials } = req.body;

        // Validate that the request body is an array
        if (!Array.isArray(materials)) {
            return res.status(400).json({
                message: 'Invalid input: expected an array of materials',
            });
        }

        // Use the `insertMany` method to add all materials to the database
        const savedMaterials = await Meterials.insertMany(materials);

        // Respond with success message and saved materials data
        return res.status(201).json({
            message: 'Materials added successfully',
            materials: savedMaterials,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: `Error adding materials: ${error.message}`,
        });
    }
};

// Get all materials or materials by category if a query parameter is provided
const getAllMeterials = async (req, res) => {
    try {
        // Check if a category query parameter is provided
        const { category } = req.query;
        const query = {};

        if (category) {
            // If category is provided, filter by category
            query.category = category;
        }

        // Find materials with the given query (empty if no category is provided)
        const materials = await Meterials.find(query);

        return res.status(200).json({
            message: `Materials${category ? ` for category ${category}` : ''} fetched successfully`,
            materials,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: `Error fetching materials: ${error.message}`,
        });
    }
};

// Get a single material by ID
const getSingleMeterials = async (req, res) => {
    try {
        const { id } = req.params;
        const material = await Meterials.findById(id);

        if (!material) {
            return res.status(404).json({
                message: 'Material not found',
            });
        }

        return res.status(200).json({
            message: 'Material retrieved successfully',
            material,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: `Error retrieving material: ${error.message}`,
        });
    }
};

// Update a material
const updateMeterials = async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;
        const material = await Meterials.findByIdAndUpdate(id, update, { new: true });

        if (!material) {
            return res.status(404).json({
                message: 'Material not found',
            });
        }

        return res.status(200).json({
            message: 'Material updated successfully',
            material,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: `Error updating material: ${error.message}`,
        });
    }
};

// Delete a material
const deleteMeterials = async (req, res) => {
    try {
        const { id } = req.params;
        const material = await Meterials.findByIdAndDelete(id);

        if (!material) {
            return res.status(404).json({
                message: 'Material not found',
            });
        }

        return res.status(200).json({
            message: 'Material deleted successfully',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: `Error deleting material: ${error.message}`,
        });
    }
};

module.exports = {
    addMeterials,
    addMultipleMaterials,
    getAllMeterials,
    getSingleMeterials,
    updateMeterials,
    deleteMeterials,
};
