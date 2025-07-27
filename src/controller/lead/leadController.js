/* eslint-disable object-curly-newline */
const { default: mongoose } = require('mongoose');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const schedule = require('node-schedule');
const Lead = require('../../schemas/LeadsSchema');
const User = require('../../schemas/auth/UserSchema');
const Department = require('../../schemas/auth/DepartmentSchema');
const {
    emitSocketEventsForNewMessage,
} = require('../../ongoing/getConversationAndUpdateLeadOptimized');
const { notifyNewLeadAssignment } = require('../../helpers/notification/lead/leadTriggers');
const { formatDateRange } = require('../../helpers/formatDateRange');
const ProductAd = require('../../schemas/ProductAdSchema');

// Utility function to add a comment to a lead and emit a Socket.io event
const addCommentToLead = async (leadId, commentData, user, io) => {
    const { comment, images } = commentData;

    // Validate input
    if (!comment) {
        throw new Error('Comment is required');
    }

    // Find the lead by ID
    const lead = await Lead.findById(leadId);
    if (!lead) {
        throw new Error('Lead not found');
    }

    // Create the new comment object
    const newComment = {
        comment,
        images: images || [],
        commentBy: user._id, // Use user ID from authentication middleware
        date: new Date(),
    };

    // Add the comment to the lead's comments array
    lead.comment.push(newComment);

    // Save the lead
    await lead.save();

    // Get the newly saved comment
    const savedComment = lead.comment[lead.comment.length - 1];

    // Manually populate the `commentBy` field with user details
    const populatedComment = {
        ...savedComment.toObject(), // Convert Mongoose document to a plain JavaScript object
        commentBy: {
            _id: user._id,
            nameAsPerNID: user.nameAsPerNID,
            profilePicture: user.profilePicture,
        },
    };

    // Emit Socket.io event for the new comment
    if (io) {
        io.emit(`newComment_${lead._id}`, {
            leadId: lead._id,
            comment: populatedComment,
        });
    }

    return populatedComment;
};

// Generic function to get users by department and role
const getUsersByRole = async (departmentName, roleName) => {
    // Find the department and role
    const department = await Department.findOne(
        { departmentName, 'roles.roleName': roleName },
        { 'roles.$': 1 }
    );

    if (!department) return [];

    // Find users with the specified roleId
    const users = await User.find({ roleId: department.roles[0]._id }).select(
        'nameAsPerNID profilePicture'
    );
    return users.map((user) => ({
        _id: user._id,
        name: user.nameAsPerNID,
        profilePicture: user.profilePicture,
    }));
};

// Helper function to get all CRE users
const getCREUsers = async () => getUsersByRole('CRE', 'CRE');

// Helper function to get all Sales users
const getSalesUsers = async () => getUsersByRole('Sales', 'Sales');

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
            productAd, // New query parameter for product ad filtering
            search
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
            const { start, end } = formatDateRange(startDate, endDate);

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

        // Add product ad filter
        if (productAd) {
            filter.productAds = new mongoose.Types.ObjectId(productAd);
        }

        if (search){
            filter.$or =[
                {name: { $regex: search, $options: 'i' }},
                {phone: { $regex: search, $options: 'i' }},
            ];
        }

        // Fetch leads with pagination and filters
        const leads = await Lead.find(filter)
            .select('-messages -callLogs')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('creName', 'nameAsPerNID nickname profilePicture')
            .populate('salesExqName', 'nameAsPerNID nickname profilePicture')
            .populate('productAds', 'name images '); // Add population for product ads

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
            'Meeting Complete',
            'Sold',
            'Prospect',
        ];

        // Extract unique Sources
        const allSources = ['Facebook', 'WhatsApp', 'Web', 'Phone'];

        // Preparing data for Bar chart
        const barchartData = (
            await Promise.all(
                allStatuses.map(async (status) => {
                    const count = await Lead.countDocuments({ ...filter, status });
                    return count > 0 ? { status, count } : null;
                })
            )
        ).filter((data) => data !== null);

        // Get unique product ads
        const uniqueProductAds = await Lead.distinct('productAds');
        const productAds = await ProductAd.find({
            _id: { $in: uniqueProductAds },
        }).select('name images');

        // Extract unique CREs and Sales Executives
        const uniqueCRENames = [];
        const uniqueSalesExecs = [];
        const creNamesSet = new Set();
        const salesExecsSet = new Set();

        // 1. Get the CRE department and roles from the Department schema
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        }).select('roles');

        if (!creDepartment || !creDepartment.roles) {
            throw new Error('CRE department or roles not found');
        }

        // Filter the CRE role from the department roles (excluding CRE Head)
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');

        if (!creRole) {
            throw new Error('CRE role not found in department');
        }

        // 2. Retrieve all active CREs with the role 'CRE' (not 'CRE Head') from User schema
        const activeCREs = await User.find({
            departmentId: creDepartment._id,
            roleId: creRole._id, // Filter by roleId for CRE
            status: 'Active', // Only active users
        }).select('_id nameAsPerNID nickname profilePicture');

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
            barchartData,
            filters: {
                statuses: allStatuses,
                sources: allSources,
                creNames: activeCREs,
                salesExecutives: uniqueSalesExecs,
                productAds, // Add product ads to filters
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
            .populate('creName', 'nameAsPerNID nickname profilePicture')
            .populate('salesExqName', 'nameAsPerNID nickname profilePicture')
            .populate('comment.commentBy', 'nameAsPerNID nickname profilePicture');

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
    const { name, phone, source, status, comment, images, cre, productAd } = req.body;

    // console.log(req.body);

    try {
        // Normalize the input phone number
        const parsedNumber = parsePhoneNumberFromString(phone, 'BD');

        if (!parsedNumber || !parsedNumber.isValid()) {
            return res.status(400).json({ msg: 'Invalid phone number format.' });
        }

        const formattedPhone = parsedNumber.number; // E.164 format (e.g., +8801957795943)

        // Step 1: Check if the phone number exists in any lead's phone array
        const existingLead = await Lead.findOne({
            phone: { $in: [formattedPhone] }, // Check if the formatted phone exists
        });

        if (existingLead) {
            return res.status(400).json({ msg: 'Phone number already exists in another lead.' });
        }

        // Step 2: Create the new lead
        const newLead = new Lead({
            name,
            phone: formattedPhone, // Save in normalized format
            source: source || 'Phone',
            status: status || 'Number Collected',
            creName: cre,
            productAds: productAd ? [productAd] : [],
        });

        // Save the new lead
        await newLead.save();

        // Step 3: Add comment if provided
        if (comment) {
            const commentData = { comment, images };
            const populatedComment = await addCommentToLead(
                newLead._id,
                commentData,
                req.user,
                req.io
            );
            newLead.comment.push(populatedComment);
        }

        // console.log(newLead);

        res.status(201).json({ msg: 'Lead created successfully', lead: newLead });
    } catch (error) {
        // console.log(error);
        console.error(`Error creating lead: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Add a comment to a Lead
exports.addComment = async (req, res) => {
    const { id } = req.params;
    const { comment, images } = req.body;

    try {
        // Add the comment using the reusable function
        const populatedComment = await addCommentToLead(id, { comment, images }, req.user, req.io);

        // Respond to the client
        res.status(200).json({
            msg: 'Comment added successfully',
            savedComment: populatedComment,
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
        const lead = await Lead.findById(id)
            .select('comment')
            .populate('comment.commentBy', 'nameAsPerNID profilePicture');

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
    // console.log('id and requirement for update', id, requirements);

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
    const { phoneNumber, comment } = req.body;

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

        // If a comment is provided, add it to the lead
        if (comment) {
            const commentData = { comment: comment.comment, images: comment.images };
            await addCommentToLead(id, commentData, req.user, req.io);
        }

        // Emit Socket.io event for updated phone number
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

    if (req.body.comment) {
        const commentData = { comment: req.body.comment.comment, images: req.body.comment.images };
        await addCommentToLead(id, commentData, req.user, req.io);
    }

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

// add a reminder to the lead
exports.addReminder = async (req, res) => {
    const { id } = req.params;
    const { time, commentId, completeLastReminder } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Check if there is any incomplete reminder
        const hasIncompleteReminder = lead.reminder.some(
            (reminder) => reminder.status === 'Pending' || reminder.status === 'Missed'
        );

        if (completeLastReminder && hasIncompleteReminder) {
            // Find the last incomplete reminder and mark it as Complete
            const lastIncompleteReminder = lead.reminder
                .filter((reminder) => reminder.status === 'Pending' || reminder.status === 'Missed')
                .slice(-1)[0];

            if (lastIncompleteReminder) {
                lastIncompleteReminder.status = 'Complete';
                // Save the lead after marking the last reminder as Complete
                await lead.save();
            }
        } else if (!completeLastReminder && hasIncompleteReminder) {
            // If completeLastReminder is false and there are incomplete reminders, return an error
            return res.status(400).json({
                msg: 'Cannot create a new reminder. Complete or resolve the previous reminder first.',
            });
        }

        // Add the new reminder to the lead's reminders array
        const newReminder = {
            time,
            status: 'Pending',
            ...(commentId && { commentId }),
        };

        lead.reminder.push(newReminder);

        // Save the updated lead after adding the new reminder
        await lead.save();

        // Fetch the updated lead with populated fields (if needed)
        const updatedLead = await Lead.findById(lead._id)
            .select('-messages -meetingDetails -messagesSeen -callLogs')
            .populate('creName', 'name')
            .populate('salesExqName', 'name')
            .lean();

        // Map reminders to include comments (if needed)
        updatedLead.reminder = updatedLead.reminder.map((reminder) => ({
            ...reminder,
            comment:
                updatedLead.comment.find(
                    (c) => c._id.toString() === reminder.commentId?.toString()
                ) || null,
        }));
        updatedLead.comment = [];

        // Emit a socket event for the new reminder
        if (req.io) {
            req.io.emit('newReminder', {
                lead: updatedLead, // Emit the entire lead object
            });
        }

        // Return only the updated reminders array
        res.status(200).json({ msg: 'Reminder added successfully', reminders: lead.reminder });
    } catch (error) {
        console.error(`Error adding reminder to lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Handler function to add a reminder with a comment to a Lead
exports.addReminderWithComment = async (req, res) => {
    const { id } = req.params;
    const { time, comment, completeLastReminder } = req.body;

    const commentData = { comment: comment.comment, images: comment.images };

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Check if there is any incomplete reminder
        const hasIncompleteReminder = lead.reminder.some(
            (reminder) => reminder.status === 'Pending' || reminder.status === 'Missed'
        );

        // If completeLastReminder is true, mark the last incomplete reminder as Complete
        if (completeLastReminder && hasIncompleteReminder) {
            const lastIncompleteReminder = lead.reminder.find(
                (reminder) => reminder.status === 'Pending' || reminder.status === 'Missed'
            );

            if (lastIncompleteReminder) {
                lastIncompleteReminder.status = 'Complete';
            }
        } else if (hasIncompleteReminder) {
            // If completeLastReminder is false or not provided, return an error
            return res.status(400).json({
                msg: 'Cannot create a new reminder. Complete or resolve the previous reminder first.',
            });
        }

        // Add the comment using the reusable function
        const populatedComment = await addCommentToLead(id, commentData, req.user, req.io);

        // Add the reminder with the commentId
        const newReminder = {
            time,
            status: 'Pending', // Default status is 'Pending'
            commentId: populatedComment._id,
        };

        lead.reminder.push(newReminder);

        // Save the lead
        await lead.save();

        // Fetch the updated lead with populated fields (if needed)
        const updatedLead = await Lead.findById(lead._id)
            .select('-messages -meetingDetails -messagesSeen -callLogs')
            .populate('creName', 'name')
            .populate('salesExqName', 'name')
            .lean();

        // Map reminders to include comments (if needed)
        updatedLead.reminder = updatedLead.reminder.map((reminder) => ({
            ...reminder,
            comment:
                updatedLead.comment.find(
                    (c) => c._id.toString() === reminder.commentId?.toString()
                ) || null,
        }));
        updatedLead.comment = [];

        // Emit a socket event for the new reminder
        if (req.io) {
            req.io.emit('newReminder', {
                lead: updatedLead, // Emit the entire lead object
            });
        }

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

// Handler function to update a reminder status
// Handler function to update a reminder status with differentiated complete statuses
exports.updateReminderStatus = async (req, res) => {
    const { leadId, reminderId } = req.params;
    // Assuming the request indicates a completion action, e.g., via a flag in req.body
    try {
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Locate the reminder within the lead's reminders array
        const reminder = lead.reminder.id(reminderId);
        if (!reminder) {
            return res.status(404).json({ msg: 'Reminder not found' });
        }

        // Update the status based on current state
        if (reminder.status === 'Missed') {
            reminder.status = 'Late Complete';
        } else if (reminder.status === 'Pending') {
            reminder.status = 'Complete';
        } else {
            return res
                .status(400)
                .json({ msg: 'Reminder cannot be completed in its current state.' });
        }

        // Save the updated lead
        await lead.save();
        res.status(200).json({ msg: 'Reminder status updated successfully', reminder });
    } catch (error) {
        console.error(`Error updating reminder status for lead ${leadId}: ${error.message}`);
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

exports.assignCreToLead = async (req, res) => {
    const { id } = req.params;
    const { newCREId } = req.body;

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Update the property and mark it as modified
        lead.creName = newCREId;
        lead.lastAssigned = new Date();
        lead.markModified('creName'); // Ensure the change is detected

        // Emit socket event for lead update
        emitSocketEventsForNewMessage(req.io, lead, lead.pageInfo);

        await lead.save();

        // send notification to CRE
        await notifyNewLeadAssignment(lead._id, newCREId);

        res.status(200).json({ msg: 'CRE assigned successfully', lead });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAllLeadsWithReminders = async (req, res) => {
    try {
        const { status, source, startDate, endDate, assignedCre, salesExecutive } = req.query;
        const userId = req.user._id;

        // Step 1: Fetch the user's details
        const user = await User.findById(userId)
            .populate({
                path: 'departmentId',
                populate: {
                    path: 'roles',
                    match: { roleName: 'CRE' },
                },
            })
            .lean();

        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        // Step 2: Determine if the user is a CRE or Admin
        const isCRE = user.departmentId?.roles?.some((role) => role.roleName === 'CRE');
        const isAdmin = user.type === 'Admin';

        // Step 3: Build the filter based on user role
        const filter = { reminder: { $exists: true, $not: { $size: 0 } } };

        if (status) filter.status = status;
        if (source) filter.source = source;
        if (salesExecutive) filter.salesExqName = salesExecutive;

        // If the user is a CRE, only show leads assigned to them
        if (isCRE) {
            filter.creName = userId;
        } else if (isAdmin) {
            // If the user is an Admin, allow filtering by CRE
            if (assignedCre) filter.creName = assignedCre;
        } else {
            // If the user is neither CRE nor Admin, deny access
            return res.status(403).json({ msg: 'Not authorized.' });
        }

        // Step 4: Apply date range filter
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (startDate && endDate) {
            if (start > end) {
                return res.status(400).json({ msg: 'startDate cannot be after endDate.' });
            }
            if (startDate === endDate) {
                // If startDate and endDate are the same, set end time to 23:59:59.999
                end.setHours(23, 59, 59, 999);
            }
            filter['reminder.time'] = { $gte: start, $lte: end };
        }

        // Step 5: Fetch leads based on the filter
        const leads = await Lead.find(filter)
            .select('-messages -meetingDetails -messagesSeen -callLogs')
            .populate('creName', 'nameAsPerNID profilePicture')
            .populate('salesExqName', 'nameAsPerNID profilePicture')
            .populate('comment.commentBy', 'nameAsPerNID profilePicture')
            .lean();

        // Step 6: Filter reminders within the specified date range
        const populatedLeads = leads.map((lead) => {
            const filteredReminders = lead.reminder.filter((reminder) => {
                const reminderTime = new Date(reminder.time);

                // If startDate and endDate are the same, compare only the date part
                if (startDate === endDate) {
                    const reminderDate = new Date(reminderTime).setHours(0, 0, 0, 0);
                    const startDateOnly = new Date(start).setHours(0, 0, 0, 0);
                    return reminderDate === startDateOnly;
                }

                // Otherwise, check if the reminder is within the date range
                return (!start || reminderTime >= start) && (!end || reminderTime <= end);
            });

            return {
                ...lead,
                reminder: filteredReminders.map((reminder) => ({
                    ...reminder,
                    comment:
                        lead.comment.find(
                            (c) => c._id.toString() === reminder.commentId?.toString()
                        ) || null,
                })),
            };
        });

        // Step 7: Filter out leads with no reminders after date filtering
        const filteredLeads = populatedLeads.filter((lead) => lead.reminder.length > 0);

        // Step 8: Send the response
        res.status(200).json({
            total: filteredLeads.length,
            leads: filteredLeads,
            filterOptions: {
                creNames: isAdmin ? await getCREUsers() : null, // Only include CRE filter for Admin
                salesNames: await getSalesUsers(),
            },
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.batchAssignLeadToCRE = async (req, res) => {
    const { leadIds, creId } = req.body;

    try {
        // Find the leads by IDs
        const leads = await Lead.find({ _id: { $in: leadIds } });

        if (leads.length !== leadIds.length) {
            return res.status(404).json({ msg: 'Some leads not found' });
        }

        // Update the property and mark it as modified
        leads.forEach((lead) => {
            lead.creName = creId;
        });

        // Save the updated leads
        await Lead.bulkWrite(
            leads.map((lead) => ({
                updateOne: {
                    filter: { _id: lead._id },
                    update: { $set: { creName: creId } },
                },
            }))
        );

        res.status(200).json({ msg: 'CRE assigned successfully', leads });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
