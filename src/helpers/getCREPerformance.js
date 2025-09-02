const Lead = require('../schemas/LeadsSchema');
const Meeting = require('../schemas/MeetingSchema');

// Helper function to calculate performance
const calculatePerformance = (completed, lateCompleted, missed) => {
    const resolved = completed + lateCompleted + missed;
    if (resolved === 0) return 0; // Avoid division by zero if no reminders are resolved
    const weightedSum = completed + 0.7 * lateCompleted;
    return (weightedSum / resolved) * 100;
};

const findLowestperformanceMetric = (performanceRates) => {
    // Extract metrics
    const { NCR, MSR, MCR, MPR, MCeR } = performanceRates;

    // Define thresholds for low positive metrics
    const lowThresholds = {
        NCR: 100, // Number Collection Ratio
        MSR: 100, // Meeting Set Ratio
        MCR: 100, // Meeting Completion Ratio
    };

    // Define thresholds for high negative metrics
    const highThresholds = {
        MPR: 1, // Meeting Postponed Ratio
        MCeR: 1, // Meeting Cancelled Ratio
    };

    // Find the lowest positive metric
    let lowestPositiveMessage = null;
    if (NCR < lowThresholds.NCR) {
        lowestPositiveMessage = `Number collection: ${NCR.toFixed(1)}%`;
    } else if (MSR < lowThresholds.MSR) {
        lowestPositiveMessage = `Meeting set: ${MSR.toFixed(1)}%`;
    } else if (MCR < lowThresholds.MCR) {
        lowestPositiveMessage = `Meeting completion: ${MCR.toFixed(1)}%`;
    }

    // Find the highest negative metric
    let highestNegativeMessage = null;
    if (MCeR > highThresholds.MCeR) {
        highestNegativeMessage = `Meeting cancellation: ${MCeR.toFixed(1)}%`;
    } else if (MPR > highThresholds.MPR) {
        highestNegativeMessage = `Meeting postpone: ${MPR.toFixed(1)}%`;
    }

    // Return the lowest positive metric and the highest negative metric
    return { lowestPositiveMessage, highestNegativeMessage };
};

const getCREPerformance = async (
    creId,
    startDate,
    endDate = new Date().setHours(23, 23, 59, 59, 999)
) => {
    try {
        // Get Total Leads in the performance window.
        const totalLeads = await Lead.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // Count all leads assigned within the performance window.
        const assigned = await Lead.countDocuments({
            creName: creId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // Fetch the last 10 leads (regardless of CRE) in the performance window.
        const lastTenLeadsDocs = await Lead.find({
            createdAt: { $gte: startDate, $lte: endDate },
        })
            .sort({ createdAt: -1 }) // Most recent first
            .limit(10);

        // Count how many of these 10 leads were assigned to the given CRE.
        const assignedRecent = lastTenLeadsDocs.filter(
            (lead) => lead.creName.toString() === creId.toString()
        ).length;

        // Count leads with collected numbers in the same period.
        const numberCollected = await Lead.countDocuments({
            creName: creId,
            phone: { $exists: true, $ne: [] },
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // Count the documents with certain meeting statuses.
        const meetings = await Lead.find({
            creName: creId,
            status: {
                $in: ['Meeting Fixed', 'Meeting Complete', 'Sold', 'Prospect'],
            },
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const meetingsSet = meetings.length;

        // Gather meeting IDs from the first meeting reference in each lead.
        const meetingIds = meetings.map((l) => l.meetings[0]?._id);
        const filteredMeetingIds = meetingIds.filter((id) => id !== undefined);

        // Retrieve leads for this CRE to further derive meeting metrics.
        const leadsForCRE = await Lead.find({
            creName: creId,
        }).select('_id');
        const leadIds = leadsForCRE.map((lead) => lead._id);

        // Count meetings completed.
        const meetingsCompleted = await Meeting.countDocuments({
            _id: { $in: filteredMeetingIds },
            status: { $in: ['Complete', 'Sold'] },
        });

        // Count rescheduled meetings.
        const meetingsRescheduled = await Meeting.countDocuments({
            _id: { $in: filteredMeetingIds },
            status: 'Rescheduled',
        });

        // Count postponed meetings.
        const meetingPostponed = await Meeting.countDocuments({
            _id: { $in: filteredMeetingIds },
            status: 'Postponed',
        });

        // Count canceled meetings.
        const meetingCancelled = await Meeting.countDocuments({
            _id: { $in: filteredMeetingIds },
            status: 'Canceled',
        });

        // Count total sold leads within the window.
        const totalSales = await Lead.countDocuments({
            creName: creId,
            status: { $in: ['Sold', 'Prospect'] },
            'finance.soldDate': { $gte: startDate, $lte: endDate },
        });

        const target = 200;

        // Query to count reminders by status.
        const reminderStatusCounts = await Lead.aggregate([
            {
                $match: {
                    creName: creId,
                    reminder: { $exists: true, $ne: [] },
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

        const lateCompleteCount =
            reminderStatusCounts.find((item) => item.status === 'Late Complete')?.count || 0;
        const completeCount =
            reminderStatusCounts.find((item) => item.status === 'Complete')?.count || 0;
        const missedCount =
            reminderStatusCounts.find((item) => item.status === 'Missed')?.count || 0;

        // Calculate follow-up performance.
        const followUpPerformance = calculatePerformance(
            completeCount,
            lateCompleteCount,
            missedCount
        );

        // Calculate various performance metrics.
        const LAR = totalLeads > 0 ? (assigned / totalLeads) * 100 : 0;
        const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
        const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
        const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
        const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
        const MRR = meetingsSet > 0 ? (meetingsRescheduled / meetingsSet) * 100 : 0;

        // calculate nagative performance data
        const MPR = meetingsSet > 0 ? (meetingPostponed / meetingsSet) * 100 : 0;
        const MCeR = meetingsSet > 0 ? (meetingCancelled / meetingsSet) * 100 : 0;

        // Calculate sales performance.
        const SR = meetingsCompleted > 0 ? (totalSales / meetingsCompleted) * 100 : 0;

        // Final composite performance score.
        const positiveAverage = (LAR + NCR + MSR + MCR + TA + SR) / 6;
        const penalty = (MRR + MPR) / 4;
        const penaltyForCancel = MCeR * 0.5;
        const performance = positiveAverage - penalty - penaltyForCancel;

        // Get performance messages
        const performanceMessages = findLowestperformanceMetric({
            NCR,
            MSR,
            MCR,
            MPR,
            MCeR,
        });

        return {
            creId,
            performance,
            assigned,
            // NEW: Return the count of leads from the last 10 assignments.
            assignedRecent,
            performanceMessages,
            performanceMetrics: {
                totalLeads,
                assigned,
                numberCollected,
                meetingsSet,
                meetingsCompleted,
                meetingsRescheduled,
                meetingPostponed,
                meetingCancelled,
                totalSales,
                followUpPerformance,
                completePerformance: performance,
                target: target - meetingsCompleted, // remaining target
            },
            performanceRates: {
                LAR,
                NCR,
                MSR,
                MCR,
                TA,
                MRR,
                MPR,
                MCeR,
                SR,
            },
        };
    } catch (error) {
        console.error('Error getting CRE performance:', error);
        return null;
    }
};

module.exports = getCREPerformance;
