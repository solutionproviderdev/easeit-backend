const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const Lead = require('../schemas/LeadsSchema');

/* eslint-disable no-restricted-syntax */
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

        // 2. Retrieve all active CREs with the role 'CRE' (not 'CRE Head') from User schema
        const activeCREs = await User.find({
            roleId: creRole._id, // Filter by roleId for CRE
            status: 'Active', // Only active users
        }).select('_id');

        if (!activeCREs || activeCREs.length === 0) {
            console.warn('No active CREs found. Assigning a default CRE.');
            return null; // Or return a default CRE ID
        }

        const creIds = activeCREs.map((cre) => cre._id);

        // 3. Aggregate the metrics for each active CRE
        const leadMetrics = await Lead.aggregate([
            {
                $match: {
                    creName: { $in: creIds },
                    status: {
                        $in: ['Number Collected', 'Meeting Fixed', 'Ongoing', 'Close'],
                    },
                    // only for leads that came in last 30 days
                    createdAt: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
            },
            {
                $group: {
                    _id: '$creName',
                    assignCount: { $sum: 1 },
                    numberCount: { $sum: { $size: '$phone' } },
                },
            },
        ]);

        // 4. If no performance data exists, assign randomly
        if (!leadMetrics || leadMetrics.length === 0) {
            console.log('No performance data found, assigning randomly.');
            if (creIds.length === 0) {
                console.warn('No active CREs available for random assignment.');
                return null; // Or return a default CRE ID
            }
            const randomCRE = creIds[Math.floor(Math.random() * creIds.length)];
            return randomCRE;
        }

        // 5. Map performance scores for each CRE
        const performanceScores = leadMetrics.map((metric) => {
            const N = (metric.numberCount * 100) / metric.assignCount;
            const T = (metric.meetingCount * 100) / 200; // Example target value

            // Calculate overall performance
            const P = (N + T) / 4;

            return {
                creId: metric._id,
                performance: P,
                assignCount: metric.assignCount,
            };
        });

        // 6. Sort the CREs based on performance in descending order
        performanceScores.sort((a, b) => b.performance - a.performance);

        // Calculate total leads
        const totalLeads = leadMetrics.reduce((sum, metric) => sum + metric.assignCount, 0);

        // Calculate active total performance
        const activeTotalPerformance = performanceScores.reduce(
            (sum, score) => sum + score.performance,
            0
        );

        // 7. Check for overflow and find the suitable CRE
        for (const cre of performanceScores) {
            const leadAssignmentRate = (cre.assignCount * 100) / totalLeads;
            const allowedAssignmentRate = (cre.performance * 100) / activeTotalPerformance;

            if (leadAssignmentRate <= allowedAssignmentRate) {
                return cre.creId; // Assign the lead to this CRE
            }
        }

        // If no CRE passes the overflow check, return the top-performing CRE
        if (performanceScores.length === 0) {
            console.warn('No performance scores available. Assigning randomly.');
            if (creIds.length === 0) {
                console.warn('No active CREs available for random assignment.');
                return null; // Or return a default CRE ID
            }
            const randomCRE = creIds[Math.floor(Math.random() * creIds.length)];
            return randomCRE;
        }

        return performanceScores[0].creId;
    } catch (error) {
        console.error('Error in getPerformanceBasedCRE:', error);
        throw error;
    }
};

module.exports = {
    getPerformanceBasedCRE,
};
