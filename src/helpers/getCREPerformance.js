const Lead = require('../schemas/LeadsSchema');
const Meeting = require('../schemas/MeetingSchema');

const getCREPerformance = async (
    creId,
    startDate,
    endDate = new Date().setHours(23, 23, 59, 59, 999)
) => {
    try {
        // get Total Leads
        const totalLeads = await Lead.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // Count leads assigned within the last 7 days
        const assigned = await Lead.countDocuments({
            creName: creId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // Count leads with collected numbers within the same period
        const numberCollected = await Lead.countDocuments({
            creName: creId,
            phone: { $exists: true, $ne: [] },
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // count the documents that are meeting fixed
        const meetings = await Lead.find({
            creName: creId,
            status: {
                $in: ['Meeting Fixed', 'Meeting Complete', 'Sold', 'Prospect'],
            },
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const meetingsSet = meetings.length;

        // get the metings ids in an array
        const meetingIds = meetings.map((l) => l.meetings[0]?._id);

        // filter out the undefined values from the meetingIds array
        const filteredMeetingIds = meetingIds.filter((id) => id !== undefined);

        console.log(filteredMeetingIds);

        // Get the leads for this CRE in the 7-day window to derive meeting metrics
        const leadsForCRE = await Lead.find({
            creName: creId,
            // createdAt: { $gte: startDate },
        }).select('_id');

        // Extract lead IDs from the leadsForCRE array
        const leadIds = leadsForCRE.map((lead) => lead._id);

        // Count meetings set (from Meeting collection) with a lower bound (7-day window)
        // const meetingsSet = await Meeting.countDocuments({
        //     lead: { $in: leadIds },
        //     date: { $gte: startDate, $lte: endDate },
        // });

        // Count meetings completed (status: 'Complete' or 'Sold') in the 7-day window
        const meetingsCompleted = await Meeting.countDocuments({
            // lead: { $in: leadIds },
            _id: { $in: filteredMeetingIds },
            status: { $in: ['Complete', 'Sold'] },
            // date: { $gte: startDate, $lte: endDate },
        });

        // Count rescheduled meetings within the 7-day window
        const meetingsRescheduled = await Meeting.countDocuments({
            // lead: { $in: leadIds },
            _id: { $in: filteredMeetingIds },
            status: 'Rescheduled',
            // date: { $gte: startDate, $lte: endDate },
        });

        // Count postponed meetings within the 7-day window
        const meetingPostponed = await Meeting.countDocuments({
            // lead: { $in: leadIds },
            _id: { $in: filteredMeetingIds },
            status: 'Postponed',
            // date: { $gte: startDate, $lte: endDate },
        });

        const meetingCancelled = await Meeting.countDocuments({
            // lead: { $in: leadIds },
            _id: { $in: filteredMeetingIds },
            status: 'Canceled',
            // date: { $gte: startDate, $lte: endDate },
        });

        // count total sold leads
        const totalSales = await Lead.countDocuments({
            creName: creId,
            status: { $in: ['Sold', 'Prospect'] },
            'finance.soldDate': { $gte: startDate, $lte: endDate },
        });

        // // Count total sales (status: 'Sold') within the 7-day window
        // const totalSales = await Meeting.countDocuments({
        //     // lead: { $in: leadIds },
        //     _id: { $in: filteredMeetingIds },
        //     status: 'Sold',
        //     // date: { $gte: startDate, $lte: endDate },
        // });

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
