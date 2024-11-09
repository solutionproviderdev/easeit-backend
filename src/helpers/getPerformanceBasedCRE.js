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
            departmentId: creDepartment._id,
            roleId: creRole._id, // Filter by roleId for CRE
            status: 'Active', // Only active users
        }).select('_id');

        if (!activeCREs || activeCREs.length === 0) {
            return null;
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
                },
            },
            {
                $group: {
                    _id: '$creName',
                    assignCount: { $sum: 1 },
                    numberCount: { $sum: { $size: '$phone' } },
                    // meetingCount: { $sum: { $size: '$meetingDetails' } },
                },
            },
        ]);

        if (!leadMetrics || leadMetrics.length === 0) {
            return null;
        }

        // 4. Map performance scores for each CRE
        const performanceScores = leadMetrics.map((metric) => {
            const N = (metric.numberCount * 100) / metric.assignCount;
            // const M = (metric.meetingCount * 100) / metric.numberCount;
            const T = (metric.meetingCount * 100) / 200; // Example target value

            // Calculate overall performance
            const P = (N + T) / 4;

            return {
                creId: metric._id,
                performance: P,
                assignCount: metric.assignCount,
            };
        });

        // 5. Sort the CREs based on performance in descending order
        performanceScores.sort((a, b) => b.performance - a.performance);

        // Calculate total leads
        const totalLeads = leadMetrics.reduce((sum, metric) => sum + metric.assignCount, 0);

        // Calculate active total performance
        const activeTotalPerformance = performanceScores.reduce(
            (sum, score) => sum + score.performance,
            0
        );

        // 6. Check for overflow and find the suitable CRE
        for (const cre of performanceScores) {
            const leadAssignmentRate = (cre.assignCount * 100) / totalLeads;
            const allowedAssignmentRate = (cre.performance * 100) / activeTotalPerformance;

            if (leadAssignmentRate <= allowedAssignmentRate) {
                return cre.creId; // Assign the lead to this CRE
            }
        }

        // If no CRE passes the overflow check, return the top-performing CRE
        return performanceScores[0].creId;
    } catch (error) {
        console.error('Error in getPerformanceBasedCRE:', error);
        throw error;
    }
};

module.exports = {
    getPerformanceBasedCRE,
};
