const { default: mongoose } = require('mongoose');
const Lead = require('../schemas/LeadsSchema');

// Helper function to calculate performance
const calculatePerformance = (completed, lateCompleted, missed) => {
    const resolved = completed + lateCompleted + missed;
    if (resolved === 0) return 0; // Avoid division by zero if no reminders are resolved
    const weightedSum = completed + 0.7 * lateCompleted;
    return (weightedSum / resolved) * 100;
};

const getCREFollowUpPerformance = async (
    creId,
    startDate,
    endDate = new Date().setHours(23, 59, 59, 999)
) => {
    try {
        // Query to count reminders by status.
        const reminderStatusCounts = await Lead.aggregate([
            {
                $match: {
                    creName: new mongoose.Types.ObjectId(creId),
                    reminder: { $exists: true, $ne: [] },
                    'reminder.time': { $gte: startDate, $lte: endDate },
                },
            },
            { $unwind: '$reminder' },
            {
                $group: {
                    _id: '$reminder.status',
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    status: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
        ]);

        const completeCount =
            reminderStatusCounts.find((item) => item.status === 'Complete')?.count || 0;
        const lateCompleteCount =
            reminderStatusCounts.find((item) => item.status === 'Late Complete')?.count || 0;
        const missedCount =
            reminderStatusCounts.find((item) => item.status === 'Missed')?.count || 0;
        const pendingCount =
            reminderStatusCounts.find((item) => item.status === 'Pending')?.count || 0;

        // Calculate follow-up performance.
        const followUpPerformance = calculatePerformance(
            completeCount,
            lateCompleteCount,
            missedCount
        );

        return {
            creId,
            followUpPerformance,
            reminderMetrics: {
                totalReminders: completeCount + lateCompleteCount + missedCount + pendingCount,
                completeCount,
                lateCompleteCount,
                missedCount,
                pendingCount,
            },
        };
    } catch (error) {
        console.error('Error getting CRE follow-up performance:', error);
        return null;
    }
};

module.exports = getCREFollowUpPerformance;
