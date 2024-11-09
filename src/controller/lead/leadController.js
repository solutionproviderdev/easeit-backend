/* eslint-disable object-curly-newline */
const { default: mongoose } = require('mongoose');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
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
            .select('-messages -callLogs')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('creName', 'nameAsPerNID nickname profilePicture')
            .populate('salesExqName', 'nameAsPerNID nickname profilePicture');

        const totalLeads = await Lead.countDocuments(filter);

        // List of all statuses
        const allStatuses = [
            'New',
            'No Response',
            'Need Support',
            'Message Rescheduled',
            'Number Collected',
            'Call Reschedule',
            'Ongoing',
            'Close',
            'Follow Up',
            'Meeting Fixed',
            'Meeting Postponed',
            'Cancel Meeting',
        ];

        // Extract unique Sources
        const allSources = ['Facebook', 'WhatsApp', 'Web', 'Phone'];

        // Extract unique CREs and Sales Executives
        const uniqueCRENames = [];
        const uniqueSalesExecs = [];
        const creNamesSet = new Set();
        const salesExecsSet = new Set();

        leads.forEach((lead) => {
            if (lead.creName && !creNamesSet.has(lead.creName._id.toString())) {
                creNamesSet.add(lead.creName._id.toString());
                uniqueCRENames.push({
                    _id: lead.creName._id,
                    name: lead.creName.nameAsPerNID,
                    nickname: lead.creName.nickname,
                    profilePicture: lead.creName.profilePicture,
                });
            }

            if (lead.salesExqName && !salesExecsSet.has(lead.salesExqName._id.toString())) {
                salesExecsSet.add(lead.salesExqName._id.toString());
                uniqueSalesExecs.push({
                    _id: lead.salesExqName._id,
                    name: lead.salesExqName.name,
                });
            }
        });

        res.status(200).json({
            total: totalLeads,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalLeads / limit),
            filters: {
                statuses: allStatuses,
                sources: allSources,
                creNames: uniqueCRENames,
                salesExecutives: uniqueSalesExecs,
            },
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

// Create a new Lead with an optional comment
exports.createLead = async (req, res) => {
    const { name, phone, source, status, comment, images } = req.body;

    try {
        // Create a new lead
        const newLead = new Lead({
            name,
            phone,
            source: source || 'Phone',
            status: status || 'Number Collected',
        });

        // If a comment is provided, add it to the lead
        if (comment) {
            newLead.comment.push({
                comment,
                images: images || [], // Add images if provided
                commentBy: req.user._id, // Use user ID from authentication middleware
                date: new Date(),
            });
        }

        // Save the lead to the database
        await newLead.save();

        res.status(201).json({ msg: 'Lead and comment created successfully', lead: newLead });
    } catch (error) {
        console.error(`Error creating lead with comment: ${error.message}`);
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
        // get the new saved comment
        const savedComment = lead.comment[lead.comment.length - 1];

        res.status(200).json({ msg: 'Comment added successfully', savedComment });

        // Emit Socket.io event for updated lead (if needed)
        req.io.emit(`newComment_${lead._id}`, {
            leadId: lead._id,
            comment: savedComment,
        });
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
    console.log('id and requirement for update', id, requirements);

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

// Add a new phone number to the lead
exports.addPhoneNumberToLead = async (req, res) => {
    const { id } = req.params;
    const { phoneNumber } = req.body;
    console.log(req.body);

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Parse and validate the phone number
        const parsedNumber = parsePhoneNumberFromString(phoneNumber, 'BD');
        if (!parsedNumber || !parsedNumber.isValid()) {
            return res.status(400).json({ msg: 'Invalid phone format put bd number' });
        }

        const formattedPhoneNumber = parsedNumber.formatInternational();

        // Check if the phone number already exists
        if (lead.phone.includes(formattedPhoneNumber)) {
            return res.status(400).json({ msg: 'Phone number already exists for this lead' });
        }

        // Add the phone number to the lead's phone array
        lead.phone.push(formattedPhoneNumber);

        // Save the lead
        await lead.save();

        // Emit Socket.io event for updated lead (if needed)
        req.io.emit(`phoneUpdate${lead._id}`, {
            leadId: lead._id,
            phoneNumber: formattedPhoneNumber,
        });

        res.status(200).json({
            msg: 'Phone number added successfully',
            updatedPhoneNumbers: lead.phone,
        });
    } catch (error) {
        console.error(`Error adding phone number to lead ${id}: ${error.message}`);
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

// Handler function to add a reminder to a Lead
exports.addReminder = async (req, res) => {
    const { id } = req.params;
    const { time, commentId } = req.body; // Removed status from request body

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Check if there is any incomplete reminder (status is either 'Pending' or 'Missed')
        const hasIncompleteReminder = lead.reminder.some(
            (reminder) => reminder.status === 'Pending' || reminder.status === 'Missed'
        );

        if (hasIncompleteReminder) {
            return res.status(400).json({
                msg: 'Cannot create a new reminder. Complete or resolve the previous reminder first.',
            });
        }

        // Add the reminder to the lead's reminders array
        lead.reminder.push({
            time,
            status: 'Pending', // Default status is 'Pending'
            ...(commentId && { commentId }), // Only add commentId if it is provided
        });

        // Save the updated lead
        await lead.save();

        // Return only the updated reminders array
        res.status(200).json({ msg: 'Reminder added successfully', reminders: lead.reminder });
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
    const { time, comment, images } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Check if there is any incomplete reminder (status is either 'Pending' or 'Missed')
        const hasIncompleteReminder = lead.reminder.some(
            (reminder) => reminder.status === 'Pending' || reminder.status === 'Missed'
        );

        if (hasIncompleteReminder) {
            return res.status(400).json({
                msg: 'Cannot create a new reminder. Complete or resolve the previous reminder first.',
            });
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
        lead.reminder.push({
            time,
            status: 'Pending', // Default status is 'Pending'
            commentId: savedCommentId,
        });

        // Save the lead again with the new reminder
        await lead.save();

        // Return only the updated reminders array
        res.status(200).json({
            msg: 'Reminder and comment added successfully',
            reminders: lead.reminder,
        });
    } catch (error) {
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
        res.status(500).json({ msg: 'Server error', error });
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

// Handler function to get all leads with reminders
exports.getAllLeadsWithReminders = async (req, res) => {
    try {
        const { status, source, startDate, endDate, assignedCre, salesExecutive } = req.query;

        // Create a filter object for the leads
        const filter = {
            reminder: { $exists: true, $not: { $size: 0 } }, // Only leads with reminders
        };

        // Add status filter if specified
        if (status) {
            filter.status = status;
        }

        // Add source filter if specified
        if (source) {
            filter.source = source;
        }

        // Add filter for CRE if specified
        if (assignedCre) {
            filter.creName = assignedCre;
        }

        // Add filter for Sales Executive if specified
        if (salesExecutive) {
            filter.salesExqName = salesExecutive;
        }

        // Fetch leads with filters, excluding the 'messages' array
        let leads = await Lead.find(filter)
            .select('-messages -meetingDetails -messagesSeen -callLogs') // Exclude unnecessary fields
            .populate('creName', 'name')
            .populate('salesExqName', 'name')
            .lean(); // Use lean() to get plain JavaScript objects

        // Filter reminders based on start and end date
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

            // If startDate and endDate are the same, set end to the end of the day
            if (startDate === endDate) {
                end.setHours(23, 59, 59, 999);
            }

            // Iterate through the leads and filter reminders by their time field
            leads = leads.map((lead) => {
                const filteredReminders = lead.reminder.filter(
                    (reminder) => reminder.time >= start && reminder.time <= end
                );

                return {
                    ...lead,
                    reminder: filteredReminders,
                };
            });

            // Remove leads without any reminders after filtering
            leads = leads.filter((lead) => lead.reminder.length > 0);
        }

        // Manually populate reminders with the corresponding comment
        const populatedLeads = leads.map((lead) => {
            const populatedReminders = lead.reminder.map((reminder) => {
                const comment = lead.comment.find(
                    (c) => c._id.toString() === reminder.commentId?.toString()
                );

                return {
                    ...reminder,
                    comment: comment
                        ? {
                              comment: comment.comment,
                              commentBy: comment.commentBy,
                              images: comment.images,
                              date: comment.date,
                          }
                        : null, // If no comment is found, return null for comment
                };
            });

            return {
                ...lead,
                comment: [], // Remove the comment array to avoid including it multiple times
                reminder: populatedReminders, // Update reminder with populated comments
            };
        });

        // Fetch unique filter options for CRE, Sales, Status, and Source
        const creNames = await Lead.distinct('creName');
        const salesNames = await Lead.distinct('salesExqName');
        const statuses = await Lead.distinct('status');
        const sources = await Lead.distinct('source');

        // Prepare filter options data
        const filterOptions = {
            creNames: creNames.map((cre) => cre?.toString()),
            salesNames: salesNames.map((sales) => sales?.toString()),
            statuses,
            sources,
        };

        res.status(200).json({
            total: leads.length,
            filterOptions,
            leads: populatedLeads,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
