const { default: mongoose } = require('mongoose');
const Lead = require('../schemas/LeadsSchema');
const Meeting = require('../schemas/MeetingSchema');

// Fix a new meeting
exports.fixMeeting = async (req, res) => {
    try {
        const {
            leadId,
            date,
            slot,
            salesExecutive,
            visitCharge,
            name,
            address,
            phone,
            projectLocation,
            requirements,
            projectStatus,
            comment,
        } = req.body;

        // Create a new meeting
        const newMeeting = new Meeting({
            lead: leadId,
            date,
            slot,
            salesExecutive,
            status: 'Fixed',
            visitCharge,
            auditFields: {
                createdBy: req.user._id,
                updatedBy: req.user._id,
            },
        });

        // Save the new meeting
        await newMeeting.save();

        // Create an update object for the lead
        const leadUpdate = {
            $push: { meetings: newMeeting._id },
            status: 'Meeting Fixed',
            salesExqName: salesExecutive,
        };

        // Conditionally update lead's name
        if (name) {
            leadUpdate.name = name;
        }

        // conditionally update lead's address
        if (address) {
            leadUpdate.address = address;
        }

        // Conditionally update lead's phone
        if (phone) {
            leadUpdate.phone = phone;
        }

        // Conditionally update lead's project location
        if (projectLocation) {
            leadUpdate.projectLocation = projectLocation;
        }

        // Conditionally update lead's requirements
        if (requirements && Array.isArray(requirements)) {
            leadUpdate.requirements = requirements;
        }

        // Conditionally update lead's project status
        if (projectStatus && projectStatus.status && projectStatus.subStatus) {
            leadUpdate.projectStatus = {
                status: projectStatus.status,
                subStatus: projectStatus.subStatus,
            };
        }

        // Conditionally add a new comment
        if (comment && comment.text) {
            const newComment = {
                comment: comment.text,
                commentBy: req.user._id,
                images: comment.images || [],
                date: new Date(),
            };
            leadUpdate.$push = { ...leadUpdate.$push, comment: newComment };
        }

        // Update the lead's reference to this meeting
        await Lead.findByIdAndUpdate(leadId, leadUpdate);

        res.status(201).json(newMeeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Create a new Lead and optionally fix a meeting
exports.createLeadAndFixMeeting = async (req, res) => {
    const {
        name,
        phone,
        source,
        status,
        comment,
        images,
        address,
        date,
        slot,
        salesExecutive,
        visitCharge,
        projectLocation,
        requirements,
        projectStatus,
    } = req.body;

    try {
        // Step 1: Create a new lead
        const newLead = new Lead({
            name,
            phone,
            source: source || 'Phone',
            status: status || (date && slot ? 'Meeting Fixed' : 'Number Collected'), // Set status to "Meeting Fixed" if meeting details provided
            address,
            projectLocation,
            requirements,
            projectStatus: projectStatus && {
                status: projectStatus.status,
                subStatus: projectStatus.subStatus,
            },
        });

        // If a comment is provided, add it to the lead
        if (comment) {
            const newComment = {
                comment,
                images: images || [],
                commentBy: req.user._id,
                date: new Date(),
            };
            newLead.comment.push(newComment);
        }

        // Save the lead to the database
        await newLead.save();

        let newMeeting = null;

        // Step 2: Fix a meeting if meeting details are provided
        if (date && slot && salesExecutive) {
            newMeeting = new Meeting({
                lead: newLead._id,
                date,
                slot,
                salesExecutive,
                status: 'Fixed',
                visitCharge,
                auditFields: {
                    createdBy: req.user._id,
                    updatedBy: req.user._id,
                },
            });

            // Save the meeting to the database
            await newMeeting.save();

            // Update the lead with the meeting reference
            newLead.meetings.push(newMeeting._id);
            newLead.status = 'Meeting Fixed';
            await newLead.save();
        }

        res.status(201).json({
            msg: 'Lead created successfully',
            lead: newLead,
            meeting: newMeeting,
        });
    } catch (error) {
        console.error('Error creating lead and fixing meeting:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Postpone a meeting and add a new reminder
exports.postponeMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { commentText, images, reminderTime } = req.body;

        // Update the meeting status
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            { status: 'Postponed', 'auditFields.updatedBy': req.user._id },
            { new: true }
        );

        if (!updatedMeeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Generate a new comment ID
        const newCommentId = new mongoose.Types.ObjectId();

        // Create a new comment object
        const newComment = {
            _id: newCommentId,
            comment: commentText || 'Meeting postponed by the sales team',
            commentBy: req.user._id,
            images: images || [],
            date: new Date(),
        };

        // Create a new reminder object linked to the new comment ID
        const newReminder = {
            time: reminderTime || new Date(), // Use provided time or default to now
            status: 'Pending',
            commentId: newCommentId, // Link the reminder to the new comment
        };

        // Update the lead with the new comment and reminder
        await Lead.findByIdAndUpdate(updatedMeeting.lead, {
            $push: {
                comment: newComment,
                reminder: newReminder,
            },
        });

        res.status(200).json(updatedMeeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Reschedule a meeting
exports.rescheduleMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            date,
            slot,
            commentText,
            images,
            salesExecutive,
            name,
            address,
            phone,
            projectLocation,
            requirements,
            projectStatus,
        } = req.body;

        console.log(req.body);

        // Update the meeting details
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            {
                date,
                slot,
                salesExecutive,
                status: 'Rescheduled',
                'auditFields.updatedBy': req.user._id,
            },
            { new: true }
        );

        if (!updatedMeeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Create an update object for the lead
        const leadUpdate = {
            salesExqName: salesExecutive, // Update the sales executive
        };

        // Conditionally update lead's name
        if (name) {
            leadUpdate.name = name;
        }

        // Conditionally update lead's address
        if (address) {
            leadUpdate.address = address;
        }

        // Conditionally update lead's phone
        if (phone) {
            leadUpdate.phone = phone;
        }

        // Conditionally update lead's project location
        if (projectLocation) {
            leadUpdate.projectLocation = projectLocation;
        }

        // Conditionally update lead's requirements
        if (requirements && Array.isArray(requirements)) {
            leadUpdate.requirements = requirements;
        }

        // Conditionally update lead's project status
        if (projectStatus && projectStatus.status && projectStatus.subStatus) {
            leadUpdate.projectStatus = {
                status: projectStatus.status,
                subStatus: projectStatus.subStatus,
            };
        }

        // Conditionally add a new comment
        if (commentText) {
            const newComment = {
                comment: commentText,
                commentBy: req.user._id,
                images: images || [],
                date: new Date(),
            };
            leadUpdate.$push = {
                comment: newComment,
            };
        }

        // Update the lead with the new details
        await Lead.findByIdAndUpdate(updatedMeeting.lead, leadUpdate);

        res.status(200).json(updatedMeeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Cancel a meeting and add a new reminder
exports.cancelMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { commentText, images, reminderTime } = req.body;

        // Update the meeting status
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            { status: 'Canceled', 'auditFields.updatedBy': req.user._id },
            { new: true }
        );

        if (!updatedMeeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Generate a new comment ID
        const newCommentId = new mongoose.Types.ObjectId();

        // Create a new comment object
        const newComment = {
            _id: newCommentId,
            comment: commentText || 'Meeting canceled by the sales team',
            commentBy: req.user._id,
            images: images || [], // Add image handling if required
            date: new Date(),
        };

        // Create a new reminder object linked to the new comment ID
        const newReminder = {
            time: reminderTime || new Date(), // Use provided time or default to now
            status: 'Pending',
            commentId: newCommentId, // Link the reminder to the new comment
        };

        // Update the lead with the new comment and reminder
        await Lead.findByIdAndUpdate(updatedMeeting.lead, {
            $push: {
                comment: newComment,
                reminder: newReminder,
            },
        });

        res.status(200).json(updatedMeeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get all meetings with filtering options
exports.getAllMeetings = async (req, res) => {
    try {
        const { status, dateRange, salesExecutiveId, creId } = req.query;
        const filter = {};

        // Filter by status if provided
        if (status) filter.status = status;

        // Handle date range filtering
        if (dateRange) {
            const [startDate, endDate] = dateRange.split('_');

            if (startDate === endDate) {
                // Specific day: set time range for that day
                const startOfDay = new Date(startDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.date = { $gte: startOfDay, $lte: endOfDay };
            } else {
                // Date range
                filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
        }

        // Filter by sales executive ID if provided
        if (salesExecutiveId) filter.salesExecutive = salesExecutiveId;

        // Filter by CRE ID if provided
        if (creId) {
            // Find leads that belong to the given creId
            const leadsMatching = await Lead.find({ creName: creId }).select('_id');
            const leadIds = leadsMatching.map((lead) => lead._id);
            // If no leads match, ensure no meetings are returned.
            filter.lead = { $in: leadIds.length > 0 ? leadIds : [null] };
        }

        // Fetch meetings with applied filters, populating lead and salesExecutive details.
        const meetings = await Meeting.find(filter)
            .populate('lead', 'name address phone creName')
            .populate('salesExecutive', 'nickname email');

        res.status(200).json(meetings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get details of a specific meeting by ID
exports.getMeetingById = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findById(id)
            .populate('lead', 'name address phone')
            .populate('salesExecutive', 'nickname profilePicture nameAsPerNID');

        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        res.status(200).json(meeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update meeting details
exports.updateMeetingDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            { ...updates, 'auditFields.updatedBy': req.user._id },
            { new: true }
        );

        if (!updatedMeeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        res.status(200).json(updatedMeeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Reassign or swap a meeting between salespeople within the same date
exports.reassignOrSwapMeeting = async (req, res) => {
    try {
        const { id } = req.params; // ID of the meeting to be moved
        const { newSalesExecutiveId, newSlot } = req.body; // New slot and sales executive details

        // Fetch the meeting being moved
        const currentMeeting = await Meeting.findById(id);
        if (!currentMeeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Ensure the new slot is on the same date as the current meeting
        const currentMeetingDate = currentMeeting.date;

        // Check if there is an existing meeting in the target slot with the same date
        const existingMeeting = await Meeting.findOne({
            date: currentMeetingDate,
            slot: newSlot,
            salesExecutive: newSalesExecutiveId,
        });

        if (existingMeeting) {
            // Swap case: update both meetings with their respective slots and sales executives
            const updatedCurrentMeeting = await Meeting.findByIdAndUpdate(
                id,
                {
                    slot: existingMeeting.slot,
                    salesExecutive: existingMeeting.salesExecutive,
                    'auditFields.updatedBy': req.user._id,
                },
                { new: true }
            );

            const updatedExistingMeeting = await Meeting.findByIdAndUpdate(
                existingMeeting._id,
                {
                    slot: currentMeeting.slot,
                    salesExecutive: currentMeeting.salesExecutive,
                    'auditFields.updatedBy': req.user._id,
                },
                { new: true }
            );

            // Update the `salesExqName` field in the respective Leads
            await Lead.findByIdAndUpdate(currentMeeting.lead, {
                salesExqName: updatedCurrentMeeting.salesExecutive,
            });

            await Lead.findByIdAndUpdate(existingMeeting.lead, {
                salesExqName: updatedExistingMeeting.salesExecutive,
            });

            return res.status(200).json({
                msg: 'Meetings swapped successfully',
                updatedCurrentMeeting,
                updatedExistingMeeting,
            });
        }

        // Reassign case: update the meeting with the new slot and/or sales executive
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            {
                slot: newSlot,
                salesExecutive: newSalesExecutiveId,
                'auditFields.updatedBy': req.user._id,
            },
            { new: true }
        );

        // Update the `salesExqName` field in the corresponding Lead
        await Lead.findByIdAndUpdate(currentMeeting.lead, {
            salesExqName: newSalesExecutiveId,
        });

        return res.status(200).json({
            msg: 'Meeting reassigned successfully',
            updatedMeeting,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.deleteMeeting = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the meeting by ID
        const meeting = await Meeting.findById(id);
        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Remove the meeting reference from the lead's meetings array
        await Lead.findByIdAndUpdate(meeting.lead, {
            $pull: { meetings: meeting._id },
        });

        // Delete the meeting
        await Meeting.findByIdAndDelete(id);

        res.status(200).json({ msg: 'Meeting deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};
