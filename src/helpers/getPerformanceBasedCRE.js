const { mongo } = require('mongoose');
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

        // Define the 7-day window start date
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // 3. Aggregate performance metrics for each active CRE over the last 7 days
        const creMetrics = await Promise.all(
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
                const leadsForCRE = await Lead.find({ creName: creId }).select('_id');
                const leadIds = leadsForCRE.map((lead) => lead._id);

                // Count meetings set (from Meeting collection) with a lower bound (7-day window)
                const meetingsSet = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    date: { $gte: sevenDaysAgo },
                });

                // Count meetings completed (status: 'Complete' or 'Sold') in the 7-day window
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

                const meetingCancelled = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Canceled',
                    date: { $gte: sevenDaysAgo },
                });

                // Count total sales (status: 'Sold') within the 7-day window
                const totalSales = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Sold',
                    date: { $gte: sevenDaysAgo },
                });

                const target = 200;

                // Calculate performance metrics:
                const LAR = assigned > 0 ? assigned : 0;
                const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
                const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
                const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
                const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
                const MRR = meetingsSet > 0 ? (meetingRescheduled / meetingsSet) * 100 : 0;
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
                };
            })
        );

        // If no performance data exists, assign randomly
        if (!creMetrics || creMetrics.length === 0) {
            console.log('No performance data found, assigning randomly.');
            if (creIds.length === 0) {
                console.warn('No active CREs available for random assignment.');
                return null;
            }
            const randomCRE = creIds[Math.floor(Math.random() * creIds.length)];
            return randomCRE;
        }

        // Overflow Management:
        // Calculate total performance and total assigned leads.
        const totalPerformance = creMetrics.reduce((sum, metric) => sum + metric.performance, 0);
        const totalAssigned = creMetrics.reduce((sum, metric) => sum + metric.assigned, 0);

        // For each CRE, compute expected assigned leads based on performance ratio.
        const metricsWithGap = creMetrics.map((metric) => {
            const expected =
                totalPerformance > 0 ? (metric.performance / totalPerformance) * totalAssigned : 0;
            const gap = expected - metric.assigned; // Positive if under-assigned.
            const ratio = expected > 0 ? metric.assigned / expected : 1;
            return {
                ...metric,
                expected,
                gap,
                ratio,
            };
        });

        // Filter CREs that are under their expected quota (gap > 0)
        const underQuota = metricsWithGap.filter((m) => m.gap > 0);

        underQuota.forEach((cre) => {
            console.log(
                `CRE: ${cre.creId}, Assigned: ${cre.assigned}, Expected: ${cre.expected}, Gap: ${cre.gap}, Ratio: ${cre.ratio}`
            );
        });

        let selectedCRE;
        if (underQuota.length > 0) {
            // Choose the one with the largest gap
            underQuota.sort((a, b) => b.gap - a.gap);
            // eslint-disable-next-line prefer-destructuring
            selectedCRE = underQuota[0];
        } else {
            // All CREs are at or above quota; choose the one
            // with the lowest ratio (most under-assigned relatively)
            metricsWithGap.sort((a, b) => a.ratio - b.ratio);
            // eslint-disable-next-line prefer-destructuring
            selectedCRE = metricsWithGap[0];
        }

        console.log('Selected CRE:', selectedCRE.creId);
        return selectedCRE.creId;
    } catch (error) {
        console.error('Error in getPerformanceBasedCRE:', error);
        throw error;
    }
};

module.exports = {
    getPerformanceBasedCRE,
};
