const ActivityLog = require('../schemas/ActivityLogSchema');

// Get all activity logs function
exports.getAllActivityLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 40;
        const skip = (page - 1) * limit;

        const activityLogs = await ActivityLog.find()
            .skip(skip)
            .limit(limit)
            .sort({ timestamp: -1 })
            .populate('userId', 'nameAsPerNID nickname email profilePicture'); // <-- add this line

        const totalLogs = await ActivityLog.countDocuments();

        res.status(200).json({
            activityLogs,
            totalLogs,
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit),
        });
    } catch (error) {
        console.error(error.message);
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
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get activity logs by user ID function
exports.getActivityLogsByUserId = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 40;
        const skip = (page - 1) * limit;

        const activityLogs = await ActivityLog.find({ userId: req.params.userId })
            .skip(skip)
            .limit(limit)
            .sort({ timestamp: -1 });

        const totalLogs = await ActivityLog.countDocuments({ userId: req.params.userId });

        res.status(200).json({
            activityLogs,
            totalLogs,
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit),
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
