const { default: mongoose } = require('mongoose');
const Lead = require('../schemas/LeadsSchema');
const Meeting = require('../schemas/MeetingSchema');
const User = require('../schemas/auth/UserSchema');
const {
    getRandomFreeSalesExecutiveFromSlot,
} = require('../helpers/meeting/getRandomFreeSalesExecutiveFromSlot');
const { log } = require('../helpers/activityLogger');

exports.fixMeeting = async (req, res) => {
    try {
        const {
            leadId,
            date,
            slot,
            salesExecutive, // optional
            visitCharge,
            name,
            address,
            phone,
            projectLocation,
            requirements,
            projectStatus,
            comment,
            title,
            purpose,
        } = req.body;

        let assignedSalesExecutive = salesExecutive;

        // If no salesExecutive is provided, find a random free one based on the date and slot
        if (!assignedSalesExecutive) {
            assignedSalesExecutive = await getRandomFreeSalesExecutiveFromSlot(date, slot);
            if (!assignedSalesExecutive) {
                return res
                    .status(400)
                    .json({ msg: 'No free sales executive available for this slot.' });
            }
        }

        // Create a new meeting with the determined sales executive
        const newMeeting = new Meeting({
            lead: leadId,
            date,
            slot,
            salesExecutive: assignedSalesExecutive,
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
            salesExqName: assignedSalesExecutive,
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
        if (comment && comment.text) {
            const newComment = {
                comment: comment.text,
                commentBy: req.user._id,
                images: comment.images || [],
                date: new Date(),
            };
            leadUpdate.$push = { ...leadUpdate.$push, comment: newComment };
        }

        // Update the lead with the new meeting and sales executive assignment
        await Lead.findByIdAndUpdate(leadId, leadUpdate);

        // Fetch lead details for activity log and notification
        const lead = await Lead.findById(leadId).select('name phone source address salesExqName');

        // Fetch sales executive nickname
        let salesExecutiveNickname = '';
        if (lead && lead.salesExqName) {
            const salesExecUser = await User.findById(lead.salesExqName).select('nickname');
            salesExecutiveNickname = salesExecUser?.nickname || '';
        }

        // Activity log for meeting set
        if (req.user && req.user._id) {
            log(req.user._id, 'LEAD_MEETING_SET', {
                lead: {
                    _id: lead._id,
                    name: lead.name,
                    phone: lead.phone,
                    source: lead.source,
                    address: lead.address,
                },
                meetingId: newMeeting._id,
                date,
                slot,
                salesExecutiveNickname,
            });
        }

        // Send notification to assigned sales executive
        try {
            const { notifyMeetingAssignment } = require('../helpers/notification/lead/meetingAssignmentTriggers');
            await notifyMeetingAssignment(leadId, assignedSalesExecutive, newMeeting, {
                title,
                purpose,
                notes: comment?.text,
                attachments: comment?.images || [],
            });

            if (req.user && req.user._id) {
                log(req.user._id, 'MEETING_ASSIGNED_NOTIFICATION_SENT', {
                    meetingId: newMeeting._id,
                    leadId,
                    salesExecutive: assignedSalesExecutive,
                    salesExecutiveNickname,
                });
            }
        } catch (notifyErr) {
            console.error('Failed to send meeting assignment notification:', notifyErr);
        }

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

            // Activity log for meeting set
            if (req.user && req.user._id) {
                log(req.user._id, 'LEAD_CREATE_AND_MEETING_SET', {
                    leadId: newLead._id,
                    meetingId: newMeeting._id,
                    date,
                    slot,
                    salesExecutive,
                });
            }
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

			// If salesExecutive is being updated, update it in the Lead too
			if (updates.salesExecutive) {
				await Lead.findByIdAndUpdate(updatedMeeting.lead, {
					salesExqName: updates.salesExecutive,
				});
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
					status: 'New',//<-- set status to "New"
				});

        // Delete the meeting
        await Meeting.findByIdAndDelete(id);

        res.status(200).json({ msg: 'Meeting deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Meeting flow controllers
exports.confirmMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { callLog } = req.body; // Optional call log data

        // Validate meeting ID
        if (!meetingId || !mongoose.Types.ObjectId.isValid(meetingId)) {
            return res.status(400).json({ msg: 'Valid meeting ID is required' });
        }

        // Find the meeting and update its flow status
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // If call log data is provided, add it to the lead
        if (callLog) {
            const lead = await Lead.findById(meeting.lead);
            if (lead) {
                lead.callLogs.push({
                    recipientNumber: callLog.recipientNumber,
                    callType: callLog.callType || 'Outgoing',
                    status: callLog.status || 'Received',
                    callDuration: callLog.callDuration,
                    timestamp: callLog.timestamp || new Date(),
                });
                await lead.save();
            }
        }

        // Update meeting flow status to confirmed
        meeting.meetingFlowStatus = 'Confirmed';
        meeting.auditFields.updatedBy = req.user._id;

        await meeting.save();

        res.status(200).json({
            message: 'Meeting confirmed successfully',
            meeting,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.leaveMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { lan, lat, time } = req.body;

        // Validate meeting ID
        if (!meetingId || !mongoose.Types.ObjectId.isValid(meetingId)) {
            return res.status(400).json({ msg: 'Valid meeting ID is required' });
        }

        // Find the meeting
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Update meeting flow status and location details
        meeting.meetingFlowStatus = 'Leaved';
        meeting.locations.leavingFrom = {
            lan: lan || '',
            lat: lat || '',
            time: time || new Date(),
        };
        meeting.auditFields.updatedBy = req.user._id;

        await meeting.save();

        res.status(200).json({
            message: 'Left for meeting successfully',
            meeting,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.arriveMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { lan, lat } = req.body;

        // Find and update the meeting
        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Update meeting flow status and arrival location/time
        meeting.meetingFlowStatus = 'Arrived';
        meeting.locations.arrivedAt = {
            lan,
            lat,
            time: new Date(),
        };

        // Save the updated meeting
        await meeting.save();

        // Update the lead's address location if it exists
        const lead = await Lead.findById(meeting.lead);
        if (lead && lead.address) {
            lead.address.location = {
                lan,
                lat,
            };
            await lead.save();
        }

        res.status(200).json({
            message: 'Arrived at meeting location successfully',
            meeting,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.startMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;

        // Validate meeting ID
        if (!meetingId || !mongoose.Types.ObjectId.isValid(meetingId)) {
            return res.status(400).json({ msg: 'Valid meeting ID is required' });
        }

        // Find the meeting and update its flow status
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ msg: 'Meeting not found' });
        }

        // Check if the meeting is in the correct state to start
        if (meeting.meetingFlowStatus !== 'Arrived') {
            return res.status(400).json({
                msg: 'Meeting cannot be started. Sales executive must arrive at location first.',
            });
        }

        // Update meeting flow status to Ongoing
        meeting.meetingFlowStatus = 'Ongoing';
        meeting.auditFields.updatedBy = req.user._id;

        await meeting.save();

        res.status(200).json({
            message: 'Meeting started successfully',
            meeting,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.endMeeting = async (req, res) => {
    try {
        // TODO: Implement meeting end logic
        res.status(200).json({ message: 'Meeting ended successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get meetings report with simple output
exports.getMeetingsReport = async (req, res) => {
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

        // Fetch meetings with applied filters and populate necessary fields
        const meetings = await Meeting.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'leads',
                    localField: 'lead',
                    foreignField: '_id',
                    as: 'lead',
                },
            },
            { $unwind: '$lead' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lead.creName',
                    foreignField: '_id',
                    as: 'creInfo',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'salesExecutive',
                    foreignField: '_id',
                    as: 'salesInfo',
                },
            },
            { $unwind: { path: '$creInfo', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$salesInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    leadName: '$lead.name',
                    phone: '$lead.phone',
                    address: '$lead.address.address',
                    meetingDate: '$date',
                    meetingSlot: '$slot',
                    projectValue: '$lead.finance.projectValue',
                    soldValue: '$lead.finance.soldAmmount',
                    creName: {
                        $cond: {
                            if: '$creInfo',
                            then: { $ifNull: ['$creInfo.nameAsPerNID', '$creInfo.nickname'] },
                            else: 'N/A',
                        },
                    },
                    salesName: {
                        $cond: {
                            if: '$salesInfo',
                            then: {
                                $ifNull: ['$salesInfo.nameAsPerNID', '$salesInfo.nickname'],
                            },
                            else: 'N/A',
                        },
                    },
                    status: 1,
                },
            },
        ]);

        // Format dates in the results
        const formattedMeetings = meetings.map((meeting) => ({
            ...meeting,
            meetingDate: new Date(meeting.meetingDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            phone: Array.isArray(meeting.phone) ? meeting.phone.join(', ') : 'N/A',
            projectValue: meeting.projectValue || 0,
            soldValue: meeting.soldValue || 0,
        }));

        res.status(200).json(formattedMeetings);
    } catch (error) {
        console.error('Error generating meetings report:', error);
        res.status(500).json({ msg: 'Server error', error });
    }
};
