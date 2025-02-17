/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { getLeadSettingsDoc } = require('../controller/settings/leadControlController');
const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const Lead = require('../schemas/LeadsSchema');
const getCREPerformance = require('./getCREPerformance');
const { selectCREBasedOnOverFlow } = require('./getPerformanceBasedCRE');

const reAssignOnNotReplied = async () => {
    console.time('reAssignOnNotReplied');
    try {
        // Get global lead settings
        const settings = await getLeadSettingsDoc();
        const {
            global: { reAssignOnReplied, messageReplyTimeMin, performanceRangeDays },
        } = settings.settingsData;

        // If reassign on replied is disabled, do nothing.
        if (!reAssignOnReplied) {
            console.log('Reassign on not replied is disabled');
            return;
        }

        // 1. Get the CRE department and roles.
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        }).select('roles');
        if (!creDepartment || !creDepartment.roles) {
            throw new Error('CRE department or roles not found');
        }

        // Filter for the CRE role.
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            throw new Error('CRE role not found in department');
        }

        // 2. Retrieve all active CREs with the CRE role.
        const activeCREs = await User.find({
            roleId: creRole._id,
            status: 'Active',
        }).select('_id nameAsPerNID');

        if (!activeCREs || activeCREs.length === 0) {
            console.warn('No active CREs found.');
            return;
        }
        const creIds = activeCREs.map((cre) => ({
            creId: cre._id,
            name: cre.nameAsPerNID,
        }));

        // 3. Get all leads that haven't been replied (status 'New' and repliedFromSystem false)
        const leads = await Lead.find({
            repliedFromSystem: false,
            status: 'New',
        });
        console.log(`Found ${leads.length} leads for reassignment.`);

        // 4. Process each lead.
        for (const lead of leads) {
            try {
                // Check if lead is overdue for reply (in minutes)
                const now = new Date();
                const leadCreated = new Date(lead.createdAt);
                const diffMinutes = (now.getTime() - leadCreated.getTime()) / (1000 * 60);
                if (diffMinutes < messageReplyTimeMin) {
                    // Lead is not overdue; skip.
                    continue;
                }

                // Exclude the currently assigned CRE.
                const remainingCREs = creIds.filter(
                    ({ creId }) => creId.toString() !== (lead.creName && lead.creName.toString())
                );
                if (remainingCREs.length === 0) {
                    // No alternate CRE available.
                    continue;
                }

                // Define the performance window start date.
                const windowStartDate = new Date(
                    Date.now() - performanceRangeDays * 24 * 60 * 60 * 1000
                );

                // Compute performance metrics for each remaining CRE.
                const creMetrics = await Promise.all(
                    remainingCREs.map(async ({ creId, name }) => {
                        const performanceData = await getCREPerformance(creId, windowStartDate);
                        const { assigned, performance } = performanceData || {};
                        return {
                            creId,
                            name,
                            performance,
                            assigned,
                        };
                    })
                );

                // Use overflow management to select the best candidate.
                const selectedCRE = selectCREBasedOnOverFlow(creMetrics, 0);
                if (selectedCRE && selectedCRE.creId) {
                    // Update the lead with the new CRE.
                    await Lead.updateOne({ _id: lead._id }, { creName: selectedCRE.creId });
                    console.log(`Lead ${lead._id} reassigned to CRE ${selectedCRE.name}`);
                }
            } catch (leadError) {
                console.error(`Error processing lead ${lead._id}:`, leadError.message);
                continue; // Move to next lead on error.
            }
        }
    } catch (error) {
        console.error('Error in reAssignOnNotReplied:', error.message);
        throw error;
    }
    console.timeEnd('reAssignOnNotReplied');
};

module.exports = {
    reAssignOnNotReplied,
};
