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

        // 3. Aggregate performance metrics for each CRE
        const leadMetrics = await Promise.all(
            creIds.map(async (creId) => {
                const assigned = await Lead.countDocuments({
                    creName: creId,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const numberCollected = await Lead.countDocuments({
                    creName: creId,
                    phone: { $exists: true, $ne: [] },
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const meetingsSet = await Lead.countDocuments({
                    creName: creId,
                    status: 'Meeting Fixed',
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const leadsForCRE = await Lead.find({
                    creName: creId,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                }).select('_id');
                const leadIds = leadsForCRE.map((lead) => lead._id);

                const meetingsCompleted = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: { $in: ['Complete', 'Sold'] },
                    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const meetingRescheduled = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Rescheduled',
                    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const meetingPostponed = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Postponed',
                    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const totalSales = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Sold',
                    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                });

                const target = 200;

                // Calculate performance metrics (if denominators > 0; else default to 0)
                const LAR = assigned > 0 ? (assigned / assigned) * 100 : 0;
                const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
                const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
                const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
                const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
                const MRR = meetingsSet > 0 ? (meetingRescheduled / meetingsSet) * 100 : 0;
                const MPR = meetingsSet > 0 ? (meetingPostponed / meetingsSet) * 100 : 0;
                const SR = meetingsCompleted > 0 ? (totalSales / meetingsCompleted) * 100 : 0;

                // **Performance Calculation:**
                // (LAR + NCR + MSR + MCR + TA + SR)/6 - (MRR + MPR)/4
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

        // Sort CREs by performance
        leadMetrics.sort((a, b) => b.performance - a.performance);

        console.log('Lead Metrics:', leadMetrics);

        // Get the best-performing CRE
        return leadMetrics[0].creId;
    } catch (error) {
        console.error('Error in getPerformanceBasedCRE:', error);
        throw error;
    }
};

module.exports = {
    getPerformanceBasedCRE,
};
