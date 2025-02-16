const Lead = require('../schemas/LeadsSchema');
const Meeting = require('../schemas/MeetingSchema');

const getCREPerformance = async (
    creId,
    startDate,
    endDate = new Date().setHours(23, 23, 59, 59, 999)
) => {
    console.log('startDate', startDate);
    console.log('endDate', endDate);
    try {
        const startDateinUTC = new Date(startDate).setHours(0, 0, 0, 0);

        // get Total Leads
        const totalLeads = await Lead.countDocuments({
            createdAt: { $gte: startDateinUTC, $lte: endDate },
        });

        // Count leads assigned within the last 7 days
        const assigned = await Lead.countDocuments({
            creName: creId,
            createdAt: { $gte: startDateinUTC },
        });

        // Count leads with collected numbers within the same period
        const numberCollected = await Lead.countDocuments({
            creName: creId,
            phone: { $exists: true, $ne: [] },
            createdAt: { $gte: startDateinUTC },
        });

        // Get the leads for this CRE in the 7-day window to derive meeting metrics
        const leadsForCRE = await Lead.find({ creName: creId }).select('_id');
        const leadIds = leadsForCRE.map((lead) => lead._id);

        // Count meetings set (from Meeting collection) with a lower bound (7-day window)
        const meetingsSet = await Meeting.countDocuments({
            lead: { $in: leadIds },
            date: { $gte: startDateinUTC },
        });

        // Count meetings completed (status: 'Complete' or 'Sold') in the 7-day window
        const meetingsCompleted = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: { $in: ['Complete', 'Sold'] },
            date: { $gte: startDateinUTC, $lte: endDate },
        });

        // Count rescheduled meetings within the 7-day window
        const meetingsRescheduled = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Rescheduled',
            date: { $gte: startDateinUTC, $lte: endDate },
        });

        // Count postponed meetings within the 7-day window
        const meetingPostponed = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Postponed',
            date: { $gte: startDateinUTC, $lte: endDate },
        });

        const meetingCancelled = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Canceled',
            date: { $gte: startDateinUTC, $lte: endDate },
        });

        // Count total sales (status: 'Sold') within the 7-day window
        const totalSales = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Sold',
            date: { $gte: startDateinUTC, $lte: endDate },
        });

        const target = 200;

        // Calculate performance metrics:
        const LAR = totalLeads > 0 ? (assigned / totalLeads) * 100 : 0;
        const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
        const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
        const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
        const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
        const MRR = meetingsSet > 0 ? (meetingsRescheduled / meetingsSet) * 100 : 0;
        const MPR = meetingsSet > 0 ? (meetingPostponed / meetingsSet) * 100 : 0;
        const MCeR = meetingsSet > 0 ? (meetingCancelled / meetingsSet) * 100 : 0;
        const SR = meetingsCompleted > 0 ? (totalSales / meetingsCompleted) * 100 : 0;

        // Complete performance formula:
        // (LAR + NCR + MSR + MCR + TA + SR) / 6 - (MRR + MPR) / 4
        const positiveAverage = (LAR + NCR + MSR + MCR + TA + SR) / 6;
        const penalty = (MRR + MPR) / 4; // 50% for rescheduled and postponed meetings
        const penaltyForCancel = MCeR * 0.5; // 50% for canceled meetings
        const performance = positiveAverage - penalty - penaltyForCancel;

        return {
            creId,
            performance,
            assigned,
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
