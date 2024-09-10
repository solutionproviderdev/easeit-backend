/* eslint-disable object-curly-newline */
const { default: mongoose } = require('mongoose');
const Lead = require('../../schemas/LeadsSchema');

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
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid lead ID' });
        }

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
    const { name, phone, source, status } = req.body;

    try {
        // Create a new lead
        const newLead = new Lead({
            name,
            phone,
            source: source || 'Phone',
            status: status || 'Number Collected',
        });

        // Save the lead to the database
        await newLead.save();

        res.status(201).json({ msg: 'Lead created successfully', lead: newLead });
    } catch (error) {
        console.error(`Error creating lead: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Add a comment to a Lead
exports.addComment = async (req, res) => {
    const { id } = req.params;
    const { comment, images } = req.body; // Extract comment and images from the request

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
            commentBy: req.user._id, // Use user ID from authentication middleware
            date: new Date(),
        });

        // Save the lead
        await lead.save();

        res.status(200).json({ msg: 'Comment added successfully', lead });
    } catch (error) {
        console.error(`Error adding comment to lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to get comments of a lead
exports.getComments = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the lead by ID and select only the comments field
        const lead = await Lead.findById(id).select('comment');

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        res.status(200).json({ comments: lead.comment });
    } catch (error) {
        console.error(`Error fetching comments for lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to add or update requirements of a Lead
exports.updateRequirements = async (req, res) => {
    const { id } = req.params;
    const { requirements } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Update the requirements of the lead
        lead.requirements = requirements;

        // Save the updated lead
        await lead.save();

        res.status(200).json({ msg: 'Requirements updated successfully', lead });
    } catch (error) {
        console.error(`Error updating requirements for lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to update a lead
exports.updateLead = async (req, res) => {
    const { id } = req.params;
    const updateFields = {};

    // Extract only the fields that are allowed to be updated
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.status) updateFields.status = req.body.status;
    if (req.body.address) updateFields.address = req.body.address;
    if (req.body.phone) updateFields.phone = req.body.phone;
    if (req.body.source) updateFields.source = req.body.source;
    if (req.body.projectStatus) updateFields.projectStatus = req.body.projectStatus;
    if (req.body.projectLocation) updateFields.projectLocation = req.body.projectLocation;
    if (req.body.messagesSeen !== undefined) updateFields.messagesSeen = req.body.messagesSeen;
    if (req.body.requirements) updateFields.requirements = req.body.requirements;

    try {
        // Find the lead by ID and update with new data
        const updatedLead = await Lead.findByIdAndUpdate(id, updateFields, { new: true });

        if (!updatedLead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        res.status(200).json({ msg: 'Lead updated successfully', lead: updatedLead });
    } catch (error) {
        console.error(`Error updating lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Updated handler function to add a reminder to a Lead
exports.addReminder = async (req, res) => {
    const { id } = req.params;
    const { time, status = 'Pending', commentId } = req.body; // Default status is 'Pending'

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Determine the initial status for the reminder
        const reminderStatus = status === 'Complete' ? 'Complete' : 'Pending'; // Set to 'Pending' by default

        // Add the reminder to the lead's reminders array
        lead.reminder.push({
            time,
            status: reminderStatus,
            commentId,
        });

        // Save the updated lead
        await lead.save();

        res.status(200).json({ msg: 'Reminder added successfully', lead });
    } catch (error) {
        console.error(`Error adding reminder to lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to update a reminder status
exports.updateReminderStatus = async (req, res) => {
    const { leadId, reminderId } = req.params;
    const { status } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(leadId);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Find the reminder by its ID within the lead's reminders array
        const reminder = lead.reminder.id(reminderId);

        if (!reminder) {
            return res.status(404).json({ msg: 'Reminder not found' });
        }

        // Update the status of the reminder
        reminder.status = status;

        // Save the updated lead
        await lead.save();

        res.status(200).json({ msg: 'Reminder status updated successfully', lead });
    } catch (error) {
        console.error(`Error updating reminder status for lead ${leadId}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to add a reminder with a comment to a Lead
exports.addReminderWithComment = async (req, res) => {
    const { id } = req.params;
    const { time, status = 'Pending', comment, images } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Add the comment to the lead's comments array
        const newComment = {
            comment,
            commentBy: req.user._id, // Assuming user ID is available from authentication middleware
            images: images || [],
            date: new Date(),
        };

        lead.comment.push(newComment);

        // Save the lead to get the commentId
        const savedLead = await lead.save();
        const savedCommentId = savedLead.comment[savedLead.comment.length - 1]._id;

        // Add the reminder with the commentId
        const newReminder = {
            time,
            status,
            commentId: savedCommentId,
        };

        lead.reminder.push(newReminder);

        // Save the lead again with the new reminder
        await lead.save();

        res.status(200).json({ msg: 'Reminder and comment added successfully', lead });
    } catch (error) {
        console.log(error);
        console.error(`Error adding reminder with comment to lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to add a call log to a Lead
exports.addCallLog = async (req, res) => {
    const { id } = req.params;
    const { recipientNumber, callType, status, callDuration, timestamp } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Add the call log to the lead's callLogs array
        lead.callLogs.push({
            recipientNumber,
            callType,
            status,
            callDuration: callDuration || 0, // Default to 0 if call duration is not provided
            timestamp,
        });

        // Save the updated lead
        await lead.save();

        res.status(200).json({ msg: 'Call log added successfully', lead });
    } catch (error) {
        console.error(`Error adding call log to lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// assigned cre need update
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
