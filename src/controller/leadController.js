/* eslint-disable no-param-reassign */
/* eslint-disable prettier/prettier */
/* eslint-disable no-return-await */
const { default: mongoose } = require('mongoose');
const Lead = require('../schemas/LeadsSchema');
const generateCustomerID = require('../helpers/CustomerIdGenerator');
const Team = require('../schemas/teamSchema');
const People = require('../schemas/PeopleSchema');

// Helper Functions
const addCommentToLead = async (leadId, images, comment, user, io) => {
    if (comment && user) {
        try {
            const lead = await Lead.findById(leadId);

            const newComment = {
                comment,
                images,
                from: user._id,
                date: new Date(),
            };

            // Assuming "comment" is an array in your lead schema
            lead.comment.push(newComment);

            await lead.save();

            const savedComment = { ...comment, from: user };

            io.emit('commentAdded', { leadId, savedComment });
        } catch (error) {
            console.error('Error adding comment to lead:', error);
        }
    }
};

function extractLeadData(body, files) {
    const {
        status,
        source,
        creName,
        name,
        phone,
        futureClient,
        visitCharge,
        nextMsgData,
        nextCallData,
        remark,
        meetingData,
        address,
        positive,
        projectStatus,
        projectLocation,
        workScope,
        time,
        date,
        salesExqName,
    } = body;

    const fileNames = files?.map(
        (file) => `${process.env.SERVER_URL}/images/${file.filename}`
    );
    let workScopes = [];
    if (Array.isArray(workScope)) {
        workScopes = workScope.map((scope) => ({
            scope,
        }));
    }
    return {
        time,
        date,
        status,
        source,
        creName,
        name,
        phone,
        visitCharge,
        remark,
        meetingData,
        address,
        nextMsgData,
        nextCallData,
        positive,
        salesExqName,
        projectStatus,
        projectLocation,
        workScopes,
        fileNames,
        futureClient,
    };
}

async function createLead(leadData) {
    const newLead = new Lead({
        CID: leadData.phone
            ? generateCustomerID(leadData.name, leadData.phone)
            : '',
        status: leadData.status,
        source: leadData.source,
        creName: leadData.creName,
        name: leadData.name,
        phone: leadData.phone,
        visitCharge: leadData.visitCharge,
        meetingData: {
            time: leadData.time,
            date: leadData.date,
        },
    });

    return await newLead.save();
}

const getLeads = async (req, res) => {
    try {
        // Extract creName and limit from query parameters
        const { creName, limit } = req.query;

        // Build the query populate the crenames name, roal, avater
        let query = Lead.find({})
            .populate({
                path: 'creName',
                select: 'name role avatar',
            }).populate({
                path: 'salesExqName',
                select: 'name role avatar',
            })
            .populate({
                path: 'comment.from',
                select: 'name role avatar', // Assuming you want to populate similar fields for commenters
            });

        if (creName) {
            // Filter by creName if provided
            query = query.where('creName').equals(creName);
        }

        // Apply limit if provided
        if (limit) {
            query = query.limit(Number(limit)); // Convert limit to a number
        }

        // Sort by creation date (newest first)
        const leads = await query.sort({ createdAt: -1 });

        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const getLeadsName = async (req, res) => {
    try {
        const leads = await Lead.find({}, 'name _id'); // Select only the name and _id fields
        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const getLeadDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id)
            .populate({
                path: 'creName',
                select: 'name role avatar',
            })
            .populate({
                path: 'comment.from',
                select: 'name role avatar', // Assuming you want to populate similar fields for commenters
            });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.status(200).json(lead);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const addLeads = async (req, res) => {
    try {
        const leadData = extractLeadData(req.body, req.files);

        // Perform any necessary validation checks
        // ...

        const newLead = new Lead({
            CID: leadData.phone
                ? generateCustomerID(leadData.name, leadData.phone)
                : '',
            status: leadData.status,
            source: leadData.source,
            creName: leadData.creName,
            name: leadData.name,
            phone: leadData.phone,
            visitCharge: leadData.visitCharge,
            meetingData: [
                {
                    time: leadData.time,
                    date: leadData.date,
                },
            ],
            address: leadData.address,
            projectStatus: leadData.projectStatus,
            projectLocation: leadData.projectLocation,
            workScope: leadData.workScopes,
            positive: leadData.positive,
        });

        const savedLead = await newLead.save();

        res.status(200).json({
            message: 'New Lead Added Successfully',
            lead: savedLead,
        });
    } catch (error) {
        console.error(error);

        // Provide a more specific error message based on the nature of the error
        let errorMessage = 'There was a server side error';
        if (error.name === 'ValidationError') {
            errorMessage = 'Validation error. Please check your input.';
        }

        res.status(500).json({ error: errorMessage });
    }
};

const addPhoneLeads = async (req, res) => {};

const addComment = async (req, res) => {
    const leadId = req.params.id;
    const { remark } = req.body;
    // const images = req.files.map((file) => file.path);
    const images = req.files?.map(
        (file) => `${process.env.SERVER_URL}/images/${file.filename}`
    );

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
        return res.status(400).send({ message: 'Invalid Lead ID' });
    }

    try {
        const lead = await Lead.findById(leadId);

        if (!lead) {
            return res.status(404).send({ message: 'Lead not found' });
        }

        const comment = {
            comment: remark,
            images,
            from: req.user._id,
            date: new Date(),
        };

        // Assuming "comment" is an array in your lead schema
        lead.comment.push(comment);

        await lead.save();

        const savedComment = { ...comment, from: req.user };

        req.io.emit('commentAdded', { leadId, savedComment });

        res
            .status(200)
            .send({ message: 'Comment added successfully', data: comment });
    } catch (error) {
        console.error('Error adding comment to lead:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
};

const updateLeadbyStatus = async (req, res) => {
    const { id } = req.params;
    const {
        status,
        workScops,
        fileNames,
        remark,
        creName,
        meetingData,
        ...updateData
    } = extractLeadData(req.body, req.files);

    try {
        await addCommentToLead(id, fileNames, remark, req.user, req.io);

        // Use findById to get the lead data by ID
        const lead = await Lead.findById(id);

        const update = { $set: { status } };

        switch (status) {
            case 'No Response':
            case 'Need Support':
                // If status is 'No Response' or 'Need Support', no additional data is needed
                break;
            case 'Message Rescheduled':
                update.$set.nextMsgData = updateData.nextMsgData;
                break;
            case 'Number Collected':
                update.$set.phone = updateData.phone;
                update.$set.CID = generateCustomerID(lead.name, updateData.phone);
                break;
            case 'Call Reschedule':
                update.$set.nextCallData = updateData.nextCallData;
                break;
            case 'Future Client':
                update.$set.nextCallData = updateData.nextCallData;
                break;
            case 'Meeting Fixed':
                if (
                    !updateData.address
                    || !updateData.projectStatus
                    || !updateData.projectLocation
                ) {
                    return res.status(400).json({
                        message: 'Missing required fields for scheduling a meeting.',
                    });
                }

                // Include all fields for 'Meeting Fixed' status
                update.$set = { ...update.$set, ...updateData };
                update.$push = {
                    meetingData,
                    workScope: { $each: updateData.workScopes },
                };
                break;
            case 'Meeting Reschedule':
                update.$push.meetingData = updateData.meetingData;
                break;
            case 'Cancel Meeting':
                // Just Status will be change so no need to update anything
                break;
            default:
                return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const updatedLead = await Lead.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
        }).populate({
            path: 'creName',
            select: 'name role avatar',
        }).populate({
            path: 'salesExqName',
            select: 'name role avatar',
        }).populate({
            path: 'comment.from',
            select: 'name role avatar', // Assuming you want to populate similar fields for commenters
        });

        if (!updatedLead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        // prepare data for socket.io event
        const socketPayload = {
            leadId: id,
            updatedLead,
        };

        // emit the event
        req.io.emit('leadStatusUpdated', socketPayload);

        // send response to client
        res.status(200).json({
            message: `Lead status updated to '${status}'.`,
            updatedLead,
        });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({
            error: 'There was a server side error',
            message: error.message,
        });
    }
};

// // Updated updateLead function to handle general updates
// const updateLead = async (req, res) => {
//     const { id } = req.params;
//     const updateData = req.body; // This now accepts any field for update

//     try {
//         // Find the lead and update it with new data
//         const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
//              new: true,
//              runValidators: true
//             });
//         if (!updatedLead) {
//             return res.status(404).json({ message: 'Lead not found' });
//         }

//         // Respond with the updated lead information
//         res.status(200).json({ message: 'Lead updated successfully', updatedLead });
//     } catch (error) {
//         console.error('Error updating lead:', error);
//         res.status(500).json({ error: 'There was a server side error', message: error.message });
//     }
// };

const updateCreName = async (req, res) => {
    const { id } = req.params;
    const { creId } = req.body;

    console.log(id, creId);

    try {
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            { creName: creId },
            { new: true } // Return the updated document
        );

        if (!updatedLead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // prepare data for socket.io event
        const cre = await People.findById(creId);

        const socketPayload = {
            leadId: id,
            updatedCre: {
                _id: creId,
                name: cre.name,
                role: cre.role,
                avatar: cre.avatar,
            },
        };

        // emit the event
        req.io.emit('creNameUpdated', socketPayload);

        res
            .status(200)
            .json({ message: 'CRE name updated successfully', updatedLead });
    } catch (error) {
        // console.log(error);
        res.status(500).json({ error: 'There was a server side error' });
    }
};

// Update lead tags
const updateLeadTags = async (req, res) => {
    const { id } = req.params;
    const { tags } = req.body;

    const lead = await Lead.findById(id);

    // Replace existing tags array with new one
    lead.tags = tags;

    await lead.save();

    // make socket.io notification
    const socketPayload = {
        leadId: id,
        updatedTags: tags
    };

    // emit the event
    req.io.emit('leadTagsUpdated', socketPayload);

    res.send({ message: 'Tags updated' });
};

const deleteLead = async (req, res) => {
    try {
        await Lead.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Lead Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

/**
 * Fixes a meeting for the lead with the given ID.
 *
 * Validates that the lead exists and meeting is not already fixed.
 * Updates the lead with the provided meeting details.
 * Checks if the team and time slot is available on the given date.
 * Updates the team's schedule with the new meeting slot if available.
 *
 * Returns updated lead and team on success.
 * Returns 404 if lead not found.
 * Returns 400 if meeting already fixed for lead.
 * Returns 400 if slot already booked for team.
 * Returns 500 on any error.
 */

const fixMeeting = async (req, res) => {
    const {
        division,
        district,
        area,
        address: detailedAddress,
        date,
        slot,
        team: teamId,
        name,
        phone,
        visitCharge,
        projectStatus,
        projectLocation,
        workScope, // This is expected to be an array of strings representing the scope
    } = req.body;

    const { id } = req.params;

    try {
        // First, check if the lead exists and its status
        const existingLead = await Lead.findById(id);
        if (!existingLead) {
            return res.status(404).send('Lead not found');
        }

        // If the lead's status is already "Meeting Fixed", return appropriate response
        if (existingLead.status === 'Meeting Fixed') {
            return res
                .status(400)
                .json({ message: 'Meeting is already fixed for this lead' });
        }

        // Check if the lead is assigned to any cre if not assigned to the user
        if (!existingLead.creName) {
            // Assigned to the user
            existingLead.creName = req.user.id;

            // save the change
            await existingLead.save();
        }

        // Transform workScope array of strings into
        // an array of objects with only the scope property
        const workScopeObjects = workScope.map((scope) => ({ scope }));

        // Proceed to update the lead with the provided details
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            {
                $set: {
                    'address.division': division,
                    'address.district': district,
                    'address.area': area,
                    'address.address': detailedAddress,
                    meetingDetails: [{ date, slot, team: teamId }],
                    name,
                    status: 'Meeting Fixed',
                    phone,
                    visitCharge,
                    projectStatus,
                    projectLocation,
                    workScope: workScopeObjects,
                },
            },
            { new: true, runValidators: true }
        );

        // Find the team and check if the slot on the given date is already booked
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).send('Team not found');
        }

        const meetingIndex = team.dailyMeetings.findIndex(
            (meeting) => meeting.date.toISOString() === new Date(date).toISOString()
        );
        if (meetingIndex !== -1) {
            const slotExists = team.dailyMeetings[meetingIndex].timeSlots.some(
                (ts) => ts.slot === slot
            );

            if (slotExists) {
                return res.status(400).send('Slot is already booked');
            }
        }

        // Add or update the meeting slot for the team
        if (meetingIndex === -1) {
            team.dailyMeetings.push({
                date,
                timeSlots: [{ slot, meeting: updatedLead._id }],
            });
        } else {
            team.dailyMeetings[meetingIndex].timeSlots.push({
                slot,
                meeting: updatedLead._id,
            });
        }

        await team.save();

        // make a socket emit to update the team's schedule

        // Make the payload
        const payload = { };

        // populate crename in the saved Lead
        await updatedLead.populate('creName', 'name avatar');

        const populatedLead = await Lead.findById(id)
            .populate('creName', 'name avatar')
            .populate({
                path: 'comment.from',
                select: 'name role avatar', // Assuming you want to populate similar fields for commenters
            });

        // add the meetingDetails to the payload
        payload.meetingDetails = {
            _id: updatedLead._id,
            name: updatedLead.name,
            status: updatedLead.status,
            phone: updatedLead.phone,
            address: updatedLead.address,
            visitCharge: updatedLead.visitCharge,
            workScope: updatedLead.workScope,
            projectLocation: updatedLead.projectLocation,
        };

        // add the populated creNames name and avater
        payload.meetingDetails.creName = {
            _id: updatedLead.creName._id,
            name: updatedLead.creName.name,
            avatar: updatedLead.creName.avatar,
        };

        // add the date, slot and the team id to the payload
        payload.date = date;
        payload.slot = slot;
        payload.teamId = teamId;

        // emit the payload to all
        req.io.emit('meeting-fixed', payload);
        req.io.emit('leadUpdate', { leadId: id, updatedLead: populatedLead });

        // Respond with the updated lead and team information
        res
            .status(200)
            .json({ message: 'Meeting fixed successfully', lead: updatedLead, team });
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: 'Error fixing meeting', error: error.message });
    }
};

const rescheduleMeeting = async (req, res) => {
    const { id } = req.params; // Lead ID
    const { date, slot, team: newTeamId } = req.body;

    try {
        // Check if the lead exists
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        // Check if the team exists
        const newTeam = await Team.findById(newTeamId);
        if (!newTeam) {
            return res.status(404).json({ message: 'New team not found.' });
        }

        // Validate if the new slot is available in the new team
        const isSlotAvailable = newTeam.dailyMeetings
        .every((meeting) => meeting.date.toISOString() !== new Date(date).toISOString()
                   || !meeting.timeSlots.some((ts) => ts.slot === slot));

        if (!isSlotAvailable) {
            return res.status(400).json({ message: 'The requested slot is already booked in the new team.' });
        }

        // change the status of the lead to 'Meeting Rescheduled'
        lead.status = 'Meeting Reschedule';

        // Change the status of the old teams meeting slot to 'Rescheduled'.
        const oldTeams = await Team.find({ 'dailyMeetings.timeSlots.meeting': id });
        // Assuming you've found the oldTeams correctly before this section
        if (oldTeams && oldTeams.length) {
            const updates = oldTeams.map(async (team) => {
                team.dailyMeetings.forEach((meeting) => {
                    meeting.timeSlots.forEach((timeSlot) => {
                        if (String(timeSlot.meeting) === String(id)) {
                            timeSlot.status = 'Rescheduled'; // Update the status
                        }
                    });
                });
                return await team.save();
            });

            // Wait for all the save operations to complete
            await Promise.all(updates);
        }

        // Add the lead to the new team's meeting slot
        const meetingDate = new Date(date);
        const existingMeetingIndex = newTeam.dailyMeetings
        .findIndex((m) => m.date.toISOString() === meetingDate.toISOString());
        if (existingMeetingIndex >= 0) {
            newTeam.dailyMeetings[existingMeetingIndex].timeSlots.push({ slot, meeting: id });
        } else {
            newTeam.dailyMeetings.push({ date: meetingDate, timeSlots: [{ slot, meeting: id }] });
        }
        await newTeam.save();

        // Update the lead's meeting details
        lead.meetingDetails.push({ date: meetingDate, slot, team: newTeamId });
        const updatedLead = await lead.save();

        // make a socket emit to update the team's schedule
        // Make the payload
        const payload = { };

        // populate crename in the saved Lead
        await updatedLead.populate('creName', 'name avatar');

        // add the meetingDetails to the payload
        payload.meetingDetails = {
            _id: updatedLead._id,
            name: updatedLead.name,
            status: updatedLead.status,
            phone: updatedLead.phone,
            address: updatedLead.address,
            visitCharge: updatedLead.visitCharge,
            workScope: updatedLead.workScope,
            projectLocation: updatedLead.projectLocation,
        };

        // add the populated creNames name and avater
        payload.meetingDetails.creName = {
            _id: updatedLead.creName._id,
            name: updatedLead.creName.name,
            avatar: updatedLead.creName.avatar,
        };

        // add the date, slot and the team id to the payload
        payload.date = date;
        payload.slot = slot;
        payload.teamId = newTeamId;

        // emit the payload to all
        req.io.emit('meeting-fixed', payload);

        // send the old meting with status 'Rescheduled.

        // make the payload by getting the last teamID and slot
        const lastMeetingDetails = updatedLead
        .meetingDetails[updatedLead.meetingDetails.length - 2];

        req.io.emit('meeting-rescheduled', lastMeetingDetails);

        res.json({ message: 'Meeting rescheduled successfully', lead, newTeam });
    } catch (error) {
        console.error('Error rescheduling meeting:', error);
        res.status(500).json({ message: 'Error rescheduling meeting', error: error.toString() });
    }
};

module.exports = {
    createLead,
    extractLeadData,
    addCommentToLead,
    addLeads,
    addComment,
    updateCreName,
    // updateLead,
    updateLeadbyStatus,
    updateLeadTags,
    rescheduleMeeting,
    deleteLead,
    getLeads,
    fixMeeting,
    getLeadDetails,
    getLeadsName,
};
