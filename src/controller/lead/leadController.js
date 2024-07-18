const { default: mongoose } = require('mongoose');
const Lead = require('../../schemas/LeadsSchema');
const User = require('../../schemas/UserSchema');

// Get All Leads (with Filters)
exports.getAllLeads = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            source,
            startDate,
            endDate,
            assignedCre,
            salesExecutive,
        } = req.query;

        // Create a filter object
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (source) {
            filter.source = source;
        }

        if (startDate || endDate) {
            if (!startDate || !endDate) {
                return res.status(400).json({
                    msg: 'Both startDate and endDate are required.',
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                return res.status(400).json({
                    msg: 'startDate cannot be after endDate.',
                });
            }

            // If startDate and endDate are the same, set end to end of the day
            if (startDate === endDate) {
                end.setHours(23, 59, 59, 999);
            }

            filter.createdAt = {
                $gte: start,
                $lte: end,
            };
        }

        if (assignedCre) {
            filter.creName = assignedCre;
        }

        if (salesExecutive) {
            filter.salesExqName = salesExecutive;
        }

        // Fetch leads with pagination and filters
        const leads = await Lead.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('creName', 'name')
            .populate('salesExqName', 'name');

        const totalLeads = await Lead.countDocuments(filter);

        res.status(200).json({
            total: totalLeads,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalLeads / limit),
            leads,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get Lead by ID
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('creName', 'name')
            .populate('salesExqName', 'name');

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        res.status(200).json(lead);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Create a new Lead
exports.createLead = async (req, res) => {
    const { name, phone } = req.body;

    try {
        // Create a new lead
        const newLead = new Lead({
            name,
            phone,
            source: 'Phone',
            status: 'Number Collected',
        });

        // Save the lead to the database
        await newLead.save();

        res.status(201).json({ msg: 'Lead created successfully', lead: newLead });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Add a comment to a Lead
exports.addComment = async (req, res) => {
    const { id } = req.params;
    const { comment, images } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Add the comment to the lead's comments array
        lead.comment.push({
            comment,
            images: images || [],
            date: new Date(),
        });

        // Save the lead
        await lead.save();

        res.status(200).json({ msg: 'Comment added successfully', lead });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Add Work Scope to a Lead
exports.addWorkScope = async (req, res) => {
    const { id } = req.params;
    const { scope, sku, squareFeet } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Add the work scope to the lead's work scope array
        lead.workScope.push({
            scope,
            sku,
            squareFeet,
        });

        // Save the lead
        await lead.save();

        res.status(200).json({ msg: 'Work scope added successfully', lead });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update Lead
exports.updateLead = async (req, res) => {
    const { id } = req.params;
    const updateFields = {};

    // Extract only the fields that are allowed to be updated
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.address) updateFields.address = req.body.address;
    if (req.body.phone) updateFields.phone = req.body.phone;
    if (req.body.tags) updateFields.tags = req.body.tags;

    try {
        // Find the lead by ID and update with new data
        const updatedLead = await Lead.findByIdAndUpdate(id, updateFields, { new: true });

        if (!updatedLead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        res.status(200).json({ msg: 'Lead updated successfully', lead: updatedLead });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// assigned cre
exports.assignCreToLead = async (req, res) => {
    const { id } = req.params;
    const { creName } = req.body;

    try {
        // Find the lead by ID and update the CRE assignment
        const lead = await Lead.findByIdAndUpdate(id, { creName }, { new: true });
        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        res.status(200).json({ msg: 'CRE assigned successfully', lead });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
