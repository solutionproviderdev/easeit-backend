const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const Lead = require('../schemas/LeadsSchema');
const Meeting = require('../schemas/MeetingSchema');

const getPerformanceBasedCRE = async () => {
    try {
        // 1. Get the CRE department and roles from the Department schema
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        }).select('roles');
        if (!creDepartment || !creDepartment.roles) {
            throw new Error('CRE department or roles not found');
        }

        // Filter the CRE role from the department roles (excluding CRE Head)
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            throw new Error('CRE role not found in department');
        }

        // 2. Retrieve all active CREs with the role 'CRE' from User schema
        const activeCREs = await User.find({
            roleId: creRole._id,
            status: 'Active',
        }).select('_id');
        if (!activeCREs || activeCREs.length === 0) {
            console.warn('No active CREs found. Assigning a default CRE.');
            return null; // Or return a default CRE ID
        }
        const creIds = activeCREs.map((cre) => cre._id);

        // Define the 7-day window start date (no end date for meetingsSet)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // 3. Aggregate performance metrics for each active CRE over the last 7 days
        const leadMetrics = await Promise.all(
            creIds.map(async (creId) => {
                // Count leads assigned within the last 7 days
                const assigned = await Lead.countDocuments({
                    creName: creId,
                    createdAt: { $gte: sevenDaysAgo },
                });

                // Count leads with collected numbers within the same period
                const numberCollected = await Lead.countDocuments({
                    creName: creId,
                    phone: { $exists: true, $ne: [] },
                    createdAt: { $gte: sevenDaysAgo },
                });

                // Get the leads for this CRE in the 7-day window to derive meeting metrics
                const leadsForCRE = await Lead.find({
                    creName: creId,
                }).select('_id');
                const leadIds = leadsForCRE.map((lead) => lead._id);

                // Count meetings set using the Meeting collection with no upper bound,
                // only a lower bound
                const meetingsSet = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    date: { $gte: sevenDaysAgo },
                });

                // Count meetings completed (status: 'Complete' or 'Sold') using the 7-day window
                const meetingsCompleted = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: { $in: ['Complete', 'Sold'] },
                    date: { $gte: sevenDaysAgo },
                });

                // Count rescheduled meetings within the 7-day window
                const meetingRescheduled = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Rescheduled',
                    date: { $gte: sevenDaysAgo },
                });

                // Count postponed meetings within the 7-day window
                const meetingPostponed = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Postponed',
                    date: { $gte: sevenDaysAgo },
                });

                // Count total sales (status: 'Sold') within the 7-day window
                const totalSales = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Sold',
                    date: { $gte: sevenDaysAgo },
                });

                const target = 200;

                // Calculate individual percentages:
                // For this 7-day window, since we're evaluating per CRE, we assume if a CRE has any assigned leads, then LAR = 100.
                const LAR = assigned > 0 ? 100 : 0;
                const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
                // MSR: ratio of meetings set (from Meeting docs) to leads with numbers collected
                const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
                // MCR: ratio of meetings completed to meetings set
                const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
                // TA: Target achieved percentage
                const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
                // MRR: Meeting Reschedule Rate
                const MRR = meetingsSet > 0 ? (meetingRescheduled / meetingsSet) * 100 : 0;
                // MPR: Meeting Postpone Rate
                const MPR = meetingsSet > 0 ? (meetingPostponed / meetingsSet) * 100 : 0;
                // SR: Sold Rate = (totalSales / meetingsCompleted) * 100
                const SR = meetingsCompleted > 0 ? (totalSales / meetingsCompleted) * 100 : 0;

                // New complete performance formula:
                // Complete Performance = (LAR + NCR + MSR + MCR + TA + SR) / 6 - (MRR + MPR) / 4
                const positiveAverage = (LAR + NCR + MSR + MCR + TA + SR) / 6;
                const penalty = (MRR + MPR) / 4;
                const completePerformance = positiveAverage - penalty;

                return {
                    creId,
                    performance: completePerformance,
                    assigned,
                };
            })
        );

        // If no performance data exists, assign randomly
        if (!leadMetrics || leadMetrics.length === 0) {
            console.log('No performance data found, assigning randomly.');
            if (creIds.length === 0) {
                console.warn('No active CREs available for random assignment.');
                return null;
            }
            const randomCRE = creIds[Math.floor(Math.random() * creIds.length)];
            return randomCRE;
        }

        // Sort CREs by performance in descending order
        leadMetrics.sort((a, b) => b.performance - a.performance);

        // Log each CRE's performance for debugging
        leadMetrics.forEach((metric) => {
            console.log(`CRE ${metric.creId} - Performance: ${metric.performance}`);
        });

        // Return the best-performing CRE's ID
        return leadMetrics[0].creId;
    } catch (error) {
        console.error('Error in getPerformanceBasedCRE:', error);
        throw error;
    }
};

module.exports = {
    getPerformanceBasedCRE,
};
