const { validationResult } = require('express-validator');
const Vendor = require('../../schemas/inventory/vendor.model');

// Get all vendors with filters
const getAllVendors = async (req, res) => {
    try {
        const {
            search,
            materialType,
            active,
            minRating,
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 10,
        } = req.query;

        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (materialType) {
            query['materials.type'] = materialType;
        }
        if (active !== undefined) {
            query.active = active === 'true';
        }
        if (minRating) {
            query.rating = { $gte: parseFloat(minRating) };
        }

        const vendors = await Vendor.find(query)
            .sort({ [sort]: order === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Vendor.countDocuments(query);

        res.json({
            vendors,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get vendor by ID
const getVendorById = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new vendor
const createVendor = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const vendor = new Vendor(req.body);
        await vendor.save();
        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update vendor
const updateVendor = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const vendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete vendor
const deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndDelete(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Contact management controllers
const addContact = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // If this is the first contact, make it primary
        const isPrimary = vendor.contacts.length === 0;

        const newContact = {
            ...req.body,
            isPrimary,
        };

        vendor.contacts.push(newContact);
        await vendor.save();

        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateContact = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const contactIndex = vendor.contacts.findIndex(
            (contact) => contact._id.toString() === req.params.contactId
        );

        if (contactIndex === -1) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        vendor.contacts[contactIndex] = {
            ...vendor.contacts[contactIndex].toObject(),
            ...req.body,
        };

        await vendor.save();
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteContact = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        vendor.contacts = vendor.contacts.filter(
            (contact) => contact._id.toString() !== req.params.contactId
        );

        await vendor.save();
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const setPrimaryContact = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // Reset all contacts to non-primary
        vendor.contacts.forEach((contact) => {
            contact.isPrimary = false;
        });

        // Set the selected contact as primary
        const contact = vendor.contacts.find(
            (contact) => contact._id.toString() === req.params.contactId
        );

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        contact.isPrimary = true;
        await vendor.save();
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Material Management Controllers
const addMaterial = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        vendor.materials.push(req.body);
        await vendor.save();
        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateMaterial = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const materialIndex = vendor.materials.findIndex(
            (material) => material._id.toString() === req.params.materialId
        );

        if (materialIndex === -1) {
            return res.status(404).json({ message: 'Material not found' });
        }

        vendor.materials[materialIndex] = {
            ...vendor.materials[materialIndex].toObject(),
            ...req.body,
        };

        await vendor.save();
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteMaterial = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        vendor.materials = vendor.materials.filter(
            (material) => material._id.toString() !== req.params.materialId
        );

        await vendor.save();
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleMaterialStatus = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const material = vendor.materials.find(
            (material) => material._id.toString() === req.params.materialId
        );

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        material.isActive = !material.isActive;
        await vendor.save();
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllVendors,
    getVendorById,
    createVendor,
    updateVendor,
    deleteVendor,
    addContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    toggleMaterialStatus,
};
