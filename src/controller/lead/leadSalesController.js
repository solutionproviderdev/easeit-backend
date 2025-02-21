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
            // meetingDetails should include at least: date, slot, salesExecutive, visitCharge.
            const newMeeting = await createNewMeeting(leadID, meetingDetails, req.user);
            newMeetingId = newMeeting._id;
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
    try {
        const { leadID, followUpID } = req.params;
        const { time, status, type, commentId, meetingId } = req.body;

        // Find the lead by ID.
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Locate the follow-up in the salesFollowUp array.
        const followUp = lead.salesFollowUp.id(followUpID);
        if (!followUp) {
            return res.status(404).json({ error: 'Follow-up not found' });
        }

        // Update provided fields.
        if (time) followUp.time = time;
        if (status) followUp.status = status;
        if (type) followUp.type = type;
        if (commentId) followUp.commentId = commentId;
        if (meetingId) followUp.meetingId = meetingId;

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
