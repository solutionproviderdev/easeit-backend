const Meeting =require("../schemas/MeetingSchema");

// Create a new meeting
 const createMeeting = async (req, res) => {
    const meetingData = req.body; // Ensure proper validation and sanitization
// console.log('meeting data---->',meetingData)
    try {
        const newMeeting = new Meeting(meetingData);
        await newMeeting.save();

        res.status(201).json(newMeeting);
    } catch (error) {
        res.status(400).json({ message: 'Failed to create meeting', error });
    }
};

// Get all meetings
 const getAllMeetings = async (req, res) => {
    // console.log('its log---------->')
    try {
        const meetings = await Meeting.find(); // Populate related fields
        res.status(200).json(meetings);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Failed to retrieve meetings', error });
    }
};

// Get a single meeting by ID
 const getSingleMeeting = async (req, res) => {
    const { id } = req.params;
        console.log('its single meeting---------->',id)

    try {
        const meeting = await Meeting.findById(id); // Populate related fields

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.status(200).json(meeting);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve meeting', error });
    }
};

// Update meeting details
 const updateMeeting = async (req, res) => {
    const { id } = req.params;
    const updates = req.body; // Ensure proper validation and sanitization

    try {
        const meeting = await Meeting.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.status(200).json(meeting);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update meeting', error });
    }
};

module.exports = { createMeeting, getAllMeetings,getSingleMeeting,updateMeeting };
