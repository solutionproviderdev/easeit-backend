const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const getCREPerformance = require('./getCREPerformance');

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
        }).select('_id nameAsPerNID');

        if (!activeCREs || activeCREs.length === 0) {
            console.warn('No active CREs found. Assigning a default CRE.');
            return null; // Or return a default CRE ID
        }
        const creIds = activeCREs.map((cre) => ({
            creId: cre._id,
            name: cre.nameAsPerNID,
        }));

        // Define the 7-day window start date
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // 3. Aggregate performance metrics for each active CRE over the last 7 days
        const creMetrics = await Promise.all(
            creIds.map(async ({ creId, name }) => {
                const performances = await getCREPerformance(creId, sevenDaysAgo);
                const { assigned, performance } = performances || {};

                return {
                    creId,
                    name,
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
                `CRE: ${cre.name}, Assigned: ${cre.assigned}, Expected: ${cre.expected}, Gap: ${cre.gap}, Ratio: ${cre.ratio}`
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
