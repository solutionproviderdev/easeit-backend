// meetingUtils.js
const Meeting = require('../schemas/MeetingSchema');
const Lead = require('../schemas/LeadsSchema');

/**
 * Creates a new meeting for the given lead.
 * @param {string} leadId - The ID of the lead.
 * @param {Object} meetingDetails - An object containing meeting details.
 *        Expected properties: date, slot, salesExecutive, visitCharge.
 * @param {Object} user - The user object (from authentication) to set audit fields.
 * @returns {Promise<Object>} - The newly created meeting document.
 */
const createNewMeeting = async (leadId, meetingDetails, user, meetingStatus, leadStatus) => {
    // Create a new meeting document
    const newMeeting = new Meeting({
        lead: leadId,
        date: meetingDetails.date,
        slot: meetingDetails.slot,
        salesExecutive: meetingDetails.salesExecutive,
        status: meetingStatus || 'Fixed',
        visitCharge: meetingDetails.visitCharge || 0,
        auditFields: {
            createdBy: user._id,
            updatedBy: user._id,
        },
    });

    await newMeeting.save();

    // Update the lead to push the new meeting into its meetings array
    //  and update its status if needed.
    await Lead.findByIdAndUpdate(leadId, {
        $push: { meetings: newMeeting._id },
        status: leadStatus || 'Meeting Fixed',
    });

    return newMeeting;
};

module.exports = { createNewMeeting };
