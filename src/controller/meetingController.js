const Lead = require('../schemas/LeadsSchema');

const getAllMeetings = async (req, res) => {
    try {
        const meetings = await Lead.find({ status: 'Meeting Fixed' }).select(
            'meetingData name creName phone address visitCharge salesExqName workScope status'
        );
        res.status(200).json(meetings);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving meetings', error: error.message });
    }
};

const getSingleMeeting = async (req, res) => {
    const { id } = req.params;
    try {
        const meeting = await Lead.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        res.status(200).json(meeting);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving meeting', error: error.message });
    }
};

const updateMeeting = async (req, res) => {
    const { id } = req.params;
    const { meetingData } = req.body; // Ensure that meetingData is structured correctly

    try {
        const updatedMeeting = await Lead.findByIdAndUpdate(
            id,
            { $set: { meetingData } },
            { new: true }
        );
        res.status(200).json({ message: 'Meeting updated successfully', updatedMeeting });
    } catch (error) {
        res.status(500).json({ message: 'Error updating meeting', error: error.message });
    }
};

module.exports = {
    getAllMeetings,
    updateMeeting,
    getSingleMeeting,
};
