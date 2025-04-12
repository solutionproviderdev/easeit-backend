const { default: mongoose } = require('mongoose');
const Lead = require('../../schemas/LeadsSchema');
const ProductAd = require('../../schemas/ProductAdSchema');

// Get all product ads
exports.getAllProductAds = async (req, res) => {
    try {
        const productAds = await ProductAd.find();
        res.status(200).json(productAds);
    } catch (error) {
      //console.error('Error fetching product ads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get a single product ad by ID
exports.getProductAdById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate leadId presence and format
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Valid Product ID is required' });
        }
        const productAd = await ProductAd.findById(id);
        if (!productAd) {
            return res.status(404).json({ error: 'Product Ad not found' });
        }
        res.status(200).json(productAd);
    } catch (error) {
      //console.error('Error fetching product ad by ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Create a new product ad
exports.createProductAd = async (req, res) => {
    try {
        const newProductAd = new ProductAd(req.body);
        const savedProductAd = await newProductAd.save();
        res.status(201).json(savedProductAd);
    } catch (error) {
      //console.error('Error creating product ad:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update an existing product ad
exports.updateProductAd = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedProductAd = await ProductAd.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updatedProductAd) {
            return res.status(404).json({ error: 'Product Ad not found' });
        }
        res.status(200).json(updatedProductAd);
    } catch (error) {
      //console.error('Error updating product ad:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Delete a product ad
exports.deleteProductAd = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProductAd = await ProductAd.findByIdAndDelete(id);
        if (!deletedProductAd) {
            return res.status(404).json({ error: 'Product Ad not found' });
        }
        res.status(200).json({ message: 'Product Ad deleted successfully' });
    } catch (error) {
      //console.error('Error deleting product ad:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Add a new image to an existing product ad
exports.addProductAdImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageData = req.body;

        if (!imageData.url) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        const productAd = await ProductAd.findById(id);
        if (!productAd) {
            return res.status(404).json({ error: 'Product ad not found' });
        }

        // Append the new image details to the images array
        productAd.images.push(imageData);
        await productAd.save();

        res.status(200).json(productAd);
    } catch (error) {
      //console.error('Error adding image to product ad:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getProductAdsForLead = async (req, res) => {
    try {
        const { leadId } = req.params;

        // Validate leadId presence and format
        if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ error: 'Valid Lead ID is required' });
        }

        // Fetch the lead by ID
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const pageId = lead.pageInfo && lead.pageInfo.pageId;
        if (!pageId) {
            return res.status(400).json({ error: 'Lead does not have a pageId' });
        }

        // Check if the lead has any product relation
        if (!lead.productAds || lead.productAds.length === 0) {
            return res.status(400).json({ message: 'This lead has no product relation' });
        }

        // If productAds exist, fetch only the related product ads.
        const productAds = await ProductAd.find({ _id: { $in: lead.productAds } });

        // Map each product ad to a simplified response object, filtering images by matching pageId.
        const response = productAds.map((ad) => ({
            name: ad.name,
            description: ad.description,
            images: ad.images.filter((img) => img.pageId === pageId),
        }));

        res.status(200).json(response);
    } catch (error) {
      //console.error('Error fetching product ads for lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
