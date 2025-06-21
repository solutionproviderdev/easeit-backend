const { createNewMeeting } = require('../../helpers/createNewMeeting');
const Lead = require('../../schemas/LeadsSchema');
const Meeting = require('../../schemas/MeetingSchema');

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

/**
 * Controller to add a new follow-up to a lead.
 * Expects the leadID in the URL parameters and follow-up details in the request body.
 */
exports.addFollowUp = async (req, res) => {
    console.log(req.body);
    try {
        const { leadID } = req.params;
        const { time, status, type, meetingDetails, comment } = req.body;
        // Find the lead by ID.
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        // If a comment is provided, add it to the lead's comment array.

        let commentId;
        if (comment) {
            const savedComment = await addCommentToLead(
                leadID,
                { comment, images: [] },
                req.user,
                req.io
            );
            commentId = savedComment._id;
        }

        let newMeetingId;
        // If the follow-up type is "Meeting", create a new meeting using the utility function.
        if (type === 'Meeting') {
            try {
                const newMeeting = await createNewMeeting(
                    leadID,
                    meetingDetails,
                    req.user,
                    meetingDetails?.meetingStatus || 'Follow-Up',
                    ''
                );
                newMeetingId = newMeeting._id;
            } catch (meetingError) {
                if (meetingError.message === 'This slot is already booked') {
                    return res.status(400).json({ error: 'This slot is already booked' });
                }
                throw meetingError;
            }
        }

        // Create the follow-up object.
        const followUpData = {
            time,
            status: status || 'Pending',
            type,
            ...(commentId && { commentId }),
            ...(newMeetingId && { meetingId: newMeetingId }),
        };

        // Add the follow-up to the lead's salesFollowUp array.
        lead.salesFollowUp.push(followUpData);
        await lead.save();

        // Return the newly added follow-up.
        return res.status(201).json({
            message: 'Follow-up added successfully',
            followUp: lead.salesFollowUp[lead.salesFollowUp.length - 1],
        });
    } catch (error) {
        console.error('Error adding follow-up:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to update an existing follow-up.
 * Expects leadID and followUpID in the URL parameters and update fields in the request body.
 */
exports.updateFollowUp = async (req, res) => {
    console.log('Received request to update follow-up');
    try {
        const { leadID, followUpID } = req.params;
        const { time, status, type, meetingDetails, comment } = req.body;

        // Find the lead by ID.
        const lead = await Lead.findById(leadID);
        console.log('Lead found:', lead);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Locate the follow-up in the salesFollowUp array using find() instead of .id()
        const followUp = lead.salesFollowUp.find((fu) => fu._id.toString() === followUpID);
        if (!followUp) {
            return res.status(404).json({ error: 'Follow-up not found' });
        }

        // Update provided fields.
        if (status) followUp.status = status;
        if (time) followUp.time = time;
        if (type) followUp.type = type;

        // Save the lead document.
        await lead.save();

        res.status(200).json({
            message: 'Follow-up updated successfully',
            followUp,
        });
    } catch (error) {
        console.error('Error updating follow-up:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Get all leads with follow-ups, with filtering options.
 * GET /lead/sales/follow-up
 */
exports.getAllFollowUps = async (req, res) => {
    try {
        const { salesExecutiveId, dateRange, status } = req.query;
        const filter = { salesFollowUp: { $exists: true, $not: { $size: 0 } } };

        // If salesExecutiveId is provided, filter leads assigned to that sales executive
        if (salesExecutiveId) {
            filter.salesExqName = salesExecutiveId;
        }

        // Filter by date range (applies to follow-ups inside salesFollowUp array)
        if (dateRange) {
            const [startDate, endDate] = dateRange.split('_');
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Ensure full day inclusion
                filter['salesFollowUp.time'] = { $gte: start, $lte: end };
            }
        }

        // Filter by status (applies to follow-ups inside salesFollowUp array)
        if (status) {
            filter['salesFollowUp.status'] = status;
        }

        // Query leads with follow-ups, applying filters
        const leadsWithFollowUps = await Lead.find(filter)
            .populate('salesExqName', 'nickname profilePicture nameAsPerNID') // Populate sales executive details
            .populate('creName', 'nickname profilePicture nameAsPerNID') // Populate sales executive details
            .populate({
                path: 'salesFollowUp.commentId',
                select: 'comment commentBy',
                populate: { path: 'commentBy', select: 'nickname email' },
            })
            .populate('salesFollowUp.meetingId', 'date slot status salesExecutive')
            .select('-messages -pageInfo -reminder');
        // console.log('leadsWithFollowUps----->',leadsWithFollowUps)
        res.status(200).json(leadsWithFollowUps);
    } catch (error) {
        console.error('Error fetching follow-ups:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to complete a meeting for a lead.
 * Route: PUT /lead/sales/meeting-complete/:leadID/:meetingId
 * Expects in req.body:
 *   - comment: Text comment to add as a lead comment.
 *   - projectValue: Updated project value.
 *   - clientsBudget: Updated clients budget.
 *   - followUpTime: A UTC string (including date and time) for the follow-up.
 *   - type: Follow-up type, either "Meeting" or "Call".
 *   - (If type is "Meeting") meetingDetails: Object containing meeting details
 *  (date, slot, salesExecutive, visitCharge).
 */
exports.completeMeeting = async (req, res) => {
    try {
        const { leadID, meetingId } = req.params;
        const {
            comment,

            projectValue,
            clientsBudget,
            followUpTime,
            type,
            meetingDetails,
        } = req.body;

        // 1. Find the lead by ID.
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // 2. Find the meeting by ID.
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // 3. Update the meeting status to "Complete".
        meeting.status = 'Complete';
        await meeting.save();

        // 4. Update the lead status to "Meeting Complete".
        lead.status = 'Meeting Complete';

        // 5. If a comment is provided, add it to the lead's comment array.
        let commentId;
        if (comment) {
            const savedComment = await addCommentToLead(
                leadID,
                { comment, images: [] },
                req.user,
                req.io
            );
            commentId = savedComment._id;
        }

        let newMeetingId;
        // 6. If the follow-up type is "Meeting", create a new meeting using the utility function.
        if (type === 'Meeting' && meetingDetails) {
            try {
                const newMeeting = await createNewMeeting(
                    leadID,
                    meetingDetails,
                    req.user,
                    'Follow-Up',
                    '' // lead status update can be handled separately if needed
                );
                newMeetingId = newMeeting._id;
            } catch (meetingError) {
                if (meetingError.message === 'This slot is already booked') {
                    return res.status(400).json({ error: 'This slot is already booked' });
                }
                throw meetingError;
            }
        }

        // For follow-up type "Call", we don't create a meeting.
        // 7. Create a new follow-up for the lead.
        // Use the provided followUpTime (as a UTC string)
        const followUpData = {
            time: new Date(followUpTime),
            status: 'Pending', // Default status for follow-ups
            type, // "Meeting" or "Call"
            ...(commentId && { commentId }),
            ...(newMeetingId && { meetingId: newMeetingId }),
        };
        lead.salesFollowUp.push(followUpData);

        // 8. Update finance details if provided.
        if (!lead.finance) {
            lead.finance = { payments: [] };
        }
        if (projectValue !== undefined) {
            lead.finance.projectValue = projectValue;
        }
        if (clientsBudget !== undefined) {
            lead.finance.clientsBudget = clientsBudget;
        }

        // Update total due if soldAmmount and totalPayment exist.
        if (lead.finance.soldAmmount !== undefined && lead.finance.totalPayment !== undefined) {
            lead.finance.totalDue = lead.finance.soldAmmount - lead.finance.totalPayment;
        }

        // 9. Save the updated lead.
        await lead.save();

        return res.status(200).json({
            message: 'Meeting completed successfully',
            meeting,
            lead,
        });
    } catch (error) {
        console.error('Error completing meeting:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to update a lead's status to 'Sold'.
 * Route: PUT /lead/sales/sold/:leadID/:meetingId
 *
 * Expects in req.body:
 *
 */
exports.updateLeadStatusToSold = async (req, res) => {};

/**
 * Controller to update a lead's status to Sold.
 * Route: PUT /lead/sales/sold/:leadID/:meetingId
 * Expects in req.body:
 *   - projectValue: Number
 *   - soldAmount: Number
 *   - clientsBudget: Number
 *   - soldDate: Date (UTC string; will be used as paymentDate)
 *   - paymentAmount: Number
 *   - paymentMethod: String (one of the allowed values)
 *   - paymentNote: String (optional)
 *   - nextFollowUpTime: String (UTC date/time)
 *   - comment: String (text comment to add)
 */
exports.updateLeadStatusToSold = async (req, res) => {
    try {
        const { leadID, meetingId } = req.params;
        const {
            projectValue,
            soldAmount,
            clientsBudget,
            soldDate,
            paymentAmount,
            paymentMethod,
            paymentNote,
            nextFollowUpTime,
            comment,
        } = req.body;

        // 1. Find the lead by ID.
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // 2. Find the meeting by ID.
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // 3. Update the meeting status to "Sold" and save.
        meeting.status = 'Sold';
        await meeting.save();

        // 4. Update the lead status to "Sold".
        lead.status = 'Sold';

        // 5. Update finance details.
        if (!lead.finance) {
            lead.finance = { payments: [] };
        }
        // Set project value, sold amount, clients budget, and sold date.
        lead.finance.projectValue = projectValue;
        lead.finance.soldAmmount = soldAmount;
        lead.finance.clientsBudget = clientsBudget;
        lead.finance.soldDate = new Date(soldDate);

        // 6. Add a new payment.
        const newPayment = {
            amount: paymentAmount,
            paymentMethod,
            paymentDate: new Date(soldDate),
            paymentStatus: 'Paid',
            paymentNote: paymentNote || '',
        };

        lead.finance.payments.push(newPayment);

        // Recalculate totalPayment: sum of amounts for all "Paid" payments.
        lead.finance.totalPayment = lead.finance.payments
            .filter((p) => p.paymentStatus === 'Paid')
            .reduce((sum, p) => sum + p.amount, 0);

        // Calculate totalDue: soldAmount - totalPayment.
        lead.finance.totalDue = soldAmount - lead.finance.totalPayment;

        // 7. Add the comment if provided.
        let commentId;
        if (comment) {
            const savedComment = await addCommentToLead(
                leadID,
                { comment, images: [] },
                req.user,
                req.io
            );
            commentId = savedComment._id;
        }

        // 8. Add a follow-up to the lead for next follow-up.
        // The follow-up type is "Call" and its commentId is from the newly added comment.
        const followUpData = {
            time: new Date(nextFollowUpTime), // Next follow-up time as UTC
            status: 'Pending',
            type: 'Call',
            ...(commentId && { commentId }),
        };
        lead.salesFollowUp.push(followUpData);

        // 9. Save the updated lead.
        await lead.save();

        return res.status(200).json({
            message: 'Lead updated to Sold successfully',
            lead,
            meeting,
        });
    } catch (error) {
        console.error('Error updating lead status to Sold:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateLeadStatusToProspect = async (req, res) => {
    try {
        // 1. Extract leadId, meetingId, and comment from request
        const { leadId, meetingId } = req.params;
        const { comment } = req.body;

        // 2. Validate comment is provided
        if (!comment || typeof comment !== 'string' || !comment.trim()) {
            return res
                .status(400)
                .json({ error: 'Comment is required and must be a non-empty string.' });
        }
        // 3. Find the lead by ID

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        // 4. Validate lead status is 'Meeting Complete'

        if (lead.status !== 'Meeting Complete') {
            return res.status(400).json({
                message: "Lead status must be 'Meeting Complete' to move to the 'Prospect' status",
            });
        }
        // 5. Find the meeting by ID

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        // 6. Update lead status to 'Prospect'

        lead.status = 'Prospect';
        // 7. Update meeting status to 'Prospect'
        meeting.status = 'Prospect';
        // 8. Add the comment to the lead's comment array
        lead.comment.push({
            comment,
            commentBy: req.user?._id,
            date: new Date(),
        });
        // 9. Save both documents

        await lead.save();
        await meeting.save();
        // 10. Respond with success

        res.status(200).json({
            message: "Lead and meeting status updated to 'Prospect'",
            lead,
            meeting,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateLeadStatusToQuotationSent = async (req, res) => {
    try {
        const { leadId, meetingId } = req.params;
        const {
 comment, projectValue, clientsBudget, followUpTime, type, meetingDetails 
} =            req.body;
        // 1. Find the lead by Id
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // 2.Find the meeting using meetingId
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // 3.Update the meeting status to "Quotation Sent"
        meeting.status = 'Quotation Sent';
        await meeting.save();

        // 4. Update the lead status to "Quotation Sent"
        lead.status = 'Quotation Sent';

        // 5. If a comment is provided, add it to the lead's comment array.
        let commentId;
        if (comment) {
            const savedComment = await addCommentToLead(
                leadId,
                { comment, images: [] },
                req.user,
                req.io
            );
            commentId = savedComment._id;
        }

        // 6. If the follow-up type is "Meeting", create a new meeting using the utility function.
        // Is the type is meeting ? and is the any existing meetingDetails object exists?
        let newMeetingId;
        if (type === 'Meeting' && meetingDetails) {
            try {
                const newMeeting = await createNewMeeting(
                    leadId,
                    meetingDetails,
                    req.user,
                    'Follow-Up',
                    ''
                );
                newMeetingId = newMeeting._id;
            } catch (meetingError) {
                if (meetingError.message === 'This slot is already booked') {
                    return res.status(400).json({ error: 'This slot is already booked' });
                }
                throw meetingError;
            }
        }

        // 7. Create a new follow-up for the lead.
        const followUpData = {
            time: new Date(followUpTime),
            status: 'Pending',
            type,
            ...(commentId && { commentId }), // if commentId exists, add it to the object ...(condition && {key : value})
            ...(newMeetingId && { meetingId: newMeetingId }),
        };
        lead.salesFollowUp.push(followUpData);

        // 8. Update the finance details if provided.
        if (!lead.finance) {
            lead.finance = { payments: [] };
        }
        // in case there is no projectValue
        if (projectValue !== undefined) {
            lead.finance.projectValue = projectValue;
        }
        if (clientsBudget !== undefined) {
            lead.finance.clientsBudget = clientsBudget;
        }

        // // Update total due if soldAmount and totalPayment exist
        // if (lead.finance.soldAmmount !== undefined && lead.finance.totalPayment !== undefined) {
        //     lead.finance.totalDue = lead.finance.soldAmmount - lead.finance.totalPayment;
        // }

        // 9. Save the updated lead.
        await lead.save();
        return res.status(200).json({
            message: 'Lead status updated to Quotation Sent successfully',
            lead,
            meeting,
        });
    } catch (error) {
        console.error('Error updating lead status to Quotation Sent:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateLeadStatusToFinalMeasurement = async (req, res) => {
    try {
        const { leadId, meetingId } = req.params;
        const { paymentAmount, paymentMethod, paymentNote, paymentDate, comment, nextPaymentDate, typeno } =            req.body;

        // 1. Validate required payment fields
        if (
            paymentAmount === undefined
            || paymentMethod === undefined
            || paymentDate === undefined
        ) {
            return res
                .status(400)
                .json({ message: 'Payment amount, method, and date are required.' });
        }

        // 2. Find the lead by ID
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // 3. Find the meeting by ID
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Validate the meeting status is "Sold"
        if (lead.status !== 'Sold') {
            return res.status(400).json({
                message: "Lead status must be 'Sold' to move to 'Final Measurement'.",
            });
        }

        // 4. Update the meeting status to "Final Measurement"
        meeting.status = 'Final Measurement';
        await meeting.save();

        // 5. Update the lead status to "Final Measurement"
        lead.status = 'Final Measurement';
        // 6. If a comment is provided, add it to the lead's comment array.
        let commentId;
        if (comment) {
            const savedComment = await addCommentToLead(
                leadId,
                { comment, images: [] },
                req.user,
                req.io
            );
            commentId = savedComment._id;
        }

        // 7. Update finance details
        if (!lead.finance) {
            lead.finance = { payments: [] };
        }
        const newPayment = {
            amount: paymentAmount,
            paymentMethod,
            paymentDate: new Date(paymentDate),
            paymentStatus: 'Paid',
            paymentNote: paymentNote || '',
        };
        lead.finance.payments.push(newPayment);

        // 8. Recalculate totalPayment : sum of amounts of all "Paid" payments
        lead.finance.totalPayment = lead.finance.payments
            .filter((p) => p.paymentStatus === 'Paid')
            .reduce((sum, p) => sum + p.amount, 0); // Sum the amounts of the filtered payments

        // 9. ReCalculate totalDue: soldAmount - totalPayment
        if (lead.finance.soldAmmount !== undefined && lead.finance.totalPayment !== undefined) {
            lead.finance.totalDue = lead.finance.soldAmmount - lead.finance.totalPayment;
        }

        // 10. Add a follow-up for next payment if nextPaymentDate is provided
        if (nextPaymentDate) {
            const nextPaymentFollowUp = {
                time: new Date(nextPaymentDate),
                status: 'Pending',
                type,
                ...(commentId && { commentId }), // if commentId exists, add it to the object
            };
            lead.salesFollowUp.push(nextPaymentFollowUp);
        }
        // 10. Save the updated lead
        await lead.save();

        return res.status(200).json({
            message: 'Lead status updated to Final Measurement successfully',
            lead,
            meeting,
        });
    } catch (error) {
        console.error('Error updating lead status to Final Measurement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
module.exports.updateLeadStatusToProspect = updateLeadStatusToProspect;
module.exports.updateLeadStatusToQuotationSent = updateLeadStatusToQuotationSent;
module.exports.updateLeadStatusToFinalMeasurement = updateLeadStatusToFinalMeasurement;
