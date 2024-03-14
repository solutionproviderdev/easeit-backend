/* eslint-disable no-lonely-if */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable prettier/prettier */
const moment = require('moment');
const Lead = require('../schemas/LeadsSchema');
const Team = require('../schemas/teamSchema');

// Create a new team
const createTeam = async (req, res) => {
    try {
        const team = new Team(req.body);
        await team.save();
        res.status(201).json({ message: 'Team created successfully', team });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error', message: error.message });
    }
};

const addMeetingToTeam = async (req, res) => {
    const {
 teamId, leadId, date, slot
} = req.body;

    // Validate slot to be one of the acceptable values
    const validSlots = ['slot_1', 'slot_2', 'slot_3', 'slot_4'];
    if (!validSlots.includes(slot)) {
        return res.status(400).json({ message: 'Invalid slot value' });
    }

    try {
        // First, validate the leadId by checking if the lead exists
        const leadExists = await Lead.findById(leadId);
        if (!leadExists) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Then, proceed with finding the team and adding the meeting
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Find or create a dailyMeeting entry for the specified date
        let dailyMeeting = team.dailyMeetings.find(
            (dm) => dm.date.toISOString().split('T')[0] === date
        );
        if (!dailyMeeting) {
            dailyMeeting = { date: new Date(date), timeSlots: [] };
            team.dailyMeetings.push(dailyMeeting);
        }

        // Check if the slot already has a meeting
        const slotIndex = dailyMeeting.timeSlots.findIndex((ts) => ts.slot === slot);
        if (slotIndex > -1) {
            // Slot already has a meeting, respond with an error
            return res
                .status(400)
                .json({ message: `Slot ${slot} is already booked for the given date` });
        }
        dailyMeeting.timeSlots.push({ slot, meeting: leadId });

        await team.save();
        res.status(200).json({ message: 'Meeting added to team successfully', team });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get details of a team
const getTeamDetails = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(200).json(team);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error', message: error.message });
    }
};

// Update a team
const updateTeam = async (req, res) => {
    try {
        const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
        console.log(req.body);
        console.log(updateTeam);
        if (!updatedTeam) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(200).json({ message: 'Team updated successfully', updatedTeam });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error', message: error.message });
        console.log(error);
    }
};

// Delete a team
const deleteTeam = async (req, res) => {
    try {
        await Team.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error', message: error.message });
    }
};

const listTeams = async (req, res) => {
    try {
        const teams = await Team.find({})
            .populate({
                path: 'leadMember.memberId',
                select: 'name role avatar -_id', // Specify the fields you want to include, exclude _id
            })
            .populate({
                path: 'supportMember.memberId',
                select: 'name role avatar -_id', // Specify the fields you want to include, exclude _id
            });

        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error', message: error.message });
    }
};

const getMeetingsByDate = async (req, res) => {
    const { date } = req.params;
    try {
        // Fetch all teams and set the strict populate options to false
        const allTeams = await Team.find({})
            .populate(
                {
                    path: 'dailyMeetings.timeSlots.meeting',
                    model: 'lead', // Ensure this matches the name you've given your model
                    select: 'name status phone address visitCharge workScope projectLocation'
                }
            )
            .populate({
                path: 'dailyMeetings.timeSlots.meeting',
                populate: {
                    path: 'creName',
                    model: 'people', // Ensure this is the correct model name
                    select: 'name avatar role'
                }
            })
            .populate('leadMember.memberId', 'name')
            .populate('supportMember.memberId', 'name');
            // .populate({
            //     // this is not working need to populate crenames name and avater.
            //     path: 'dailyMeetings.timeSlots.meeting.creName',
            //     model: 'people',
            //     select: 'name avatar role'
            // });

        // Iterate through all teams to format the response
        const formattedResponse = allTeams.map((team) => {
            // Find meetings for the given date
            const dailyMeetingsForDate = team.dailyMeetings.filter((dailyMeeting) => moment(dailyMeeting.date).format('YYYY-MM-DD') === moment(new Date(date)).format('YYYY-MM-DD'));

            // Populate meetings if they exist for that date
            const populatedDailyMeetings = dailyMeetingsForDate.length > 0
                ? dailyMeetingsForDate.map((dailyMeeting) => ({
                    date: dailyMeeting.date,
                    timeSlots: dailyMeeting.timeSlots.map((timeSlot) => ({
                        slot: timeSlot.slot,
                        meetingDetails: timeSlot.meeting ? {
                            _id: timeSlot.meeting._id,
                            name: timeSlot.meeting.name,
                            status: timeSlot.meeting.status,
                            phone: timeSlot.meeting.phone,
                            address: timeSlot.meeting.address,
                            visitCharge: timeSlot.meeting.visitCharge,
                            workScope: timeSlot.meeting.workScope,
                            creName: timeSlot.meeting.creName,
                            projectLocation: timeSlot.meeting.projectLocation
                        } : null
                    }))
                }))
                : [{
                    date: new Date(date),
                    timeSlots: [] // No meetings found for this date
                }];

            return {
                _id: team._id,
                teamName: team.teamName,
                leadMember: team.leadMember.memberId.name,
                supportMember: team.supportMember.memberId.name,
                dailyMeetings: populatedDailyMeetings
            };
        });

        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching meetings by date', error: error.message });
    }
};

const swapMeetingBetweenTeams = async (req, res) => {
    const { sourceTeamId, destinationTeamId, slot } = req.body;
    const { date } = req.params;

    try {
        const sourceTeam = await Team.findById(sourceTeamId);
        let destinationTeam = await Team.findById(destinationTeamId);

        if (!sourceTeam || !destinationTeam) {
            return res.status(404).json({ message: 'One or both teams not found' });
        }

        const sourceDailyMeeting = sourceTeam.dailyMeetings.find((dm) => dm.date.toISOString().split('T')[0] === date);
        let destinationDailyMeeting = destinationTeam.dailyMeetings.find((dm) => dm.date.toISOString().split('T')[0] === date);

        // If the destination team does not have a dailyMeeting for the given date,
        // create it and save immediately
        if (!destinationDailyMeeting) {
            destinationDailyMeeting = { date: new Date(date), timeSlots: [] };
            destinationTeam.dailyMeetings.push(destinationDailyMeeting);
            await destinationTeam.save();

            // Re-fetch the destination team to ensure we're working with the updated document
            destinationTeam = await Team.findById(destinationTeamId);
            destinationDailyMeeting = destinationTeam.dailyMeetings.find((dm) => dm.date.toISOString().split('T')[0] === date);
        }

        const sourceSlotIndex = sourceDailyMeeting ? sourceDailyMeeting.timeSlots.findIndex(
            (ts) => ts.slot === slot
        ) : -1;
        const destinationSlotIndex = destinationDailyMeeting.timeSlots.findIndex(
            (ts) => ts.slot === slot
        );

        if (sourceSlotIndex > -1) {
            const sourceSlotMeeting = sourceDailyMeeting.timeSlots[sourceSlotIndex].meeting;

            if (destinationSlotIndex > -1) {
                // Swap meetings between source and destination slots
                // eslint-disable-next-line max-len
                const destinationSlotMeeting = destinationDailyMeeting.timeSlots[destinationSlotIndex].meeting;
                destinationDailyMeeting.timeSlots[destinationSlotIndex].meeting = sourceSlotMeeting;
                sourceDailyMeeting.timeSlots[sourceSlotIndex].meeting = destinationSlotMeeting;
            } else {
                // Move the meeting to the destination slot
                destinationDailyMeeting.timeSlots.push({ slot, meeting: sourceSlotMeeting });
                sourceDailyMeeting.timeSlots.splice(sourceSlotIndex, 1);
            }
        } else {
            if (destinationSlotIndex > -1) {
                return res.status(400).json({ message: 'Cannot swap. The source slot is empty and the destination slot is already occupied.' });
            }
        }

        await sourceTeam.save();
        await destinationTeam.save();

        res.status(200).json({ message: 'Meeting swap/move completed successfully', sourceTeam, destinationTeam });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const swapSlotsWithinTeam = async (req, res) => {
    const { teamId, sourceSlot, destinationSlot } = req.body;
    const { date } = req.params; // Extracting date from the request parameters

    try {
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Find the dailyMeeting for the given date
        const dailyMeeting = team.dailyMeetings.find((dm) => dm.date.toISOString().split('T')[0] === date);
        if (!dailyMeeting) {
            return res.status(404).json({ message: 'Daily meeting not found for the given date' });
        }

        // Find indexes for source and destination slots
        const sourceMeetingIndex = dailyMeeting.timeSlots.findIndex((ts) => ts.slot === sourceSlot);
        const destinationMeetingIndex = dailyMeeting.timeSlots
        .findIndex((ts) => ts.slot === destinationSlot);

        // If neither slot exists, it means both are available; nothing to swap
        if (sourceMeetingIndex === -1 && destinationMeetingIndex === -1) {
            return res.status(400).json({ message: 'Both slots are available, nothing to swap.' });
        }

        // Handling the case where the destination slot does not exist (it's available)
        if (destinationMeetingIndex === -1) {
            if (sourceMeetingIndex === -1) {
                return res.status(400).json({ message: 'Source slot is also available, nothing to move.' });
            }

            // Move the meeting from the source slot to the new destination slot
            const meetingToMove = dailyMeeting.timeSlots.splice(sourceMeetingIndex, 1)[0];
            dailyMeeting.timeSlots.push({ slot: destinationSlot, meeting: meetingToMove.meeting });
        } else {
            // Both slots exist; swap the meetings between them
            if (sourceMeetingIndex !== -1) {
                const temp = dailyMeeting.timeSlots[destinationMeetingIndex].meeting;
                dailyMeeting.timeSlots[destinationMeetingIndex].meeting = dailyMeeting
                .timeSlots[sourceMeetingIndex].meeting;
                dailyMeeting.timeSlots[sourceMeetingIndex].meeting = temp;
            } else {
                // The source slot is available (no meeting to move),
                // so technically this becomes an invalid operation
                return res.status(400).json({
                    message: 'Source slot is available, cannot swap with a filled destination slot.'
                 });
            }
        }

        await team.save();
        res.status(200).json({
            message: 'Slots swapped/moved successfully within the same team',
            team
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createTeam,
    listTeams,
    deleteTeam,
    getTeamDetails,
    updateTeam,
    addMeetingToTeam,
    getMeetingsByDate,
    swapSlotsWithinTeam,
    swapMeetingBetweenTeams,
};
