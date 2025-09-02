/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
const { getLeadSettingsDoc } = require('../controller/settings/leadControlController');
const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const getCREPerformance = require('./getCREPerformance');


const selectCREBasedOnOverFlow = (creMetrics, position = 0, manualOverrides = []) => {
    // Use a fixed base count (10) to represent the max leads considered in the "recent" window.
    const baseCount = 10;

    // Parse manual override values: build a map from creId to manual rate (numeric)
    const manualMap = {};
    manualOverrides.forEach((override) => {
        // Assume manualLeadAssignRate is a string like "50%"
        if (override.manualLeadAssignRate) {
            const rate = parseFloat(override.manualLeadAssignRate.replace('%', ''));
            if (!isNaN(rate)) {
                manualMap[override.creId] = rate;
            }
        }
    });

    // Partition metrics into manual and non-manual groups.
    const manualGroup = [];
    const nonManualGroup = [];
    creMetrics.forEach((metric) => {
        if (manualMap[metric.creId]) {
            manualGroup.push(metric);
        } else {
            nonManualGroup.push(metric);
        }
    });

    // Instead of aggregating the full assigned value over a long period, we
    // now base our expected calculations on a constant maximum of 10 recent leads.
    // For CREs with a manual override, expected leads are calculated as a percentage of baseCount.
    const manualMetrics = manualGroup.map((metric) => {
        const manualRate = manualMap[metric.creId];
        const expected = (manualRate / 100) * baseCount;
        // Use metric.assignedRecent (should be the number of leads in the last 10 assigned to that CRE)
        const gap = expected - metric.assignedRecent; // Positive if under-assigned within the recent 10
        const ratio = expected > 0 ? metric.assignedRecent / expected : 1;
        return {
            ...metric,
            expected,
            gap,
            ratio,
            manualRate,
        };
    });

    // For non-manual CREs, we first sum the performance for each.
    const totalPerformanceNonManual = nonManualGroup.reduce((sum, m) => sum + m.performance, 0);
    // Sum of manual override percentages from the manual group.
    const sumManual = manualGroup.reduce((sum, m) => sum + manualMap[m.creId], 0);

    // Calculate expected leads for non-manual CREs.
    // The available portion of the baseCount for non-manual CREs is:
    // baseCount * ((100 - sumManual) / 100)
    const nonManualMetrics = nonManualGroup.map((metric) => {
        const expected =
            totalPerformanceNonManual > 0
                ? (metric.performance / totalPerformanceNonManual) *
                  (baseCount * ((100 - sumManual) / 100))
                : 0;
        const gap = expected - metric.assignedRecent;
        const ratio = expected > 0 ? metric.assignedRecent / expected : 1;
        return {
            ...metric,
            expected,
            gap,
            ratio,
        };
    });

    // Merge the two arrays.
    const mergedMetrics = [...manualMetrics, ...nonManualMetrics];

    // Now select one candidate.
    // First, try to find those under their expected quota (gap > 0).
    const underQuota = mergedMetrics.filter((m) => m.gap > 0);
    let selectedCRE;
    if (underQuota.length > 0) {
        // Sort candidates descending by gap (largest gap first)
        underQuota.sort((a, b) => b.gap - a.gap);
        selectedCRE = underQuota[position];
    } else {
        // Otherwise, sort by lowest ratio (i.e. most under-assigned relative to expectation)
        mergedMetrics.sort((a, b) => a.ratio - b.ratio);
        selectedCRE = mergedMetrics[position];
    }

    // (Optional) Log debug info for underQuota candidates.
    underQuota.forEach((cre) => {
        // console.log(
        //     `CRE: ${cre.name}, AssignedRecent: ${
        //         cre.assignedRecent
        //     }, Expected: ${cre.expected.toFixed(2)}, Gap: ${cre.gap.toFixed(
        //         2
        //     )}, Ratio: ${cre.ratio.toFixed(2)}`
        // );
    });

    return selectedCRE;
};

const getPerformanceBasedCRE = async (position) => {
    try {
        // 1. Get the CRE department and roles from the Department schema.
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        }).select('roles');
        if (!creDepartment || !creDepartment.roles) {
            throw new Error('CRE department or roles not found');
        }

        // Filter the CRE role from the department roles.
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            throw new Error('CRE role not found in department');
        }

        // 2. Retrieve all active CREs with the role 'CRE' from User schema.
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

        const settings = await getLeadSettingsDoc();
        const performanceRangeDays = settings.settingsData?.global?.performanceRangeDays || 7;
        const manualOverrides = settings?.settingsData?.creManualOverrides || [];

        // Define the performance window start date.
        const dateRange = new Date(performanceRangeDays);

        // 3. Aggregate performance metrics for each active CRE over the performance window.
        // IMPORTANT: Ensure each performance object includes a property "assignedRecent"
        // that counts the number of leads assigned to the CRE in the last 10 leads.
        const creMetrics = await Promise.all(
            creIds.map(async ({ creId, name }) => {
                const performances = await getCREPerformance(creId, dateRange);
                const { assigned, performance, assignedRecent } = performances || {};
                return {
                    creId,
                    name,
                    performance,
                    // Use the new recent-assigned value instead of the full-window "assigned"
                    assignedRecent,
                };
            })
        );

        // If no performance data exists, assign randomly.
        if (!creMetrics || creMetrics.length === 0) {
            console.log('No performance data found, assigning randomly.');
            if (creIds.length === 0) {
                console.warn('No active CREs available for random assignment.');
                return null;
            }
            const randomCRE = creIds[Math.floor(Math.random() * creIds.length)];
            return randomCRE.creId;
        }

        // Use the overflow management helper to select the appropriate CRE.
        const selectedCRE = selectCREBasedOnOverFlow(creMetrics, position, manualOverrides);
        // console.log('Selected CRE:', selectedCRE.name);
        return selectedCRE.creId;
    } catch (error) {
        // console.error('Error in getPerformanceBasedCRE:', error);
        throw error;
    }
};

module.exports = {
    getPerformanceBasedCRE,
    selectCREBasedOnOverFlow,
};
