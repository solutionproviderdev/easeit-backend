const ActivityLog = require('../schemas/ActivityLogSchema');

// Get all activity logs function
exports.getAllActivityLogs = async (req, res) => {
    try {
        const activityLogs = await ActivityLog.find();
        res.status(200).json(activityLogs);
    } catch (error) {
      //console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Delete activity log function
exports.deleteActivityLog = async (req, res) => {
    try {
        const { id } = req.params;
        const activityLog = await ActivityLog.findById(id);
        if (!activityLog) {
            return res.status(404).json({ msg: 'Activity log not found' });
        }

        await ActivityLog.deleteOne({ _id: id });
        res.status(200).json({ msg: 'Activity log deleted' });
    } catch (error) {
      //console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get activity logs by user ID function
exports.getActivityLogsByUserId = async (req, res) => {
    try {
        const activityLogs = await ActivityLog.find({ userId: req.params.userId });
        if (!activityLogs) {
            return res.status(404).json({ msg: 'No activity logs found for this user' });
        }
        res.status(200).json(activityLogs);
    } catch (error) {
      //console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
