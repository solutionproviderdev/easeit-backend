/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { getLeadSettingsDoc } = require('../controller/settings/leadControlController');
const {
    emitSocketEventsForNewMessage,
} = require('../ongoing/getConversationAndUpdateLeadOptimized');
const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const Lead = require('../schemas/LeadsSchema');
const getCREPerformance = require('./getCREPerformance');
const { selectCREBasedOnOverFlow } = require('./getPerformanceBasedCRE');

const reAssignOnNotSeen = async (io) => {
    console.time('reAssignOnNotSeen');
    try {
        // Get global lead settings
        const settings = await getLeadSettingsDoc();
        const {
            global: { reAssignOnSeen, messageSeenTimeMin, performanceRangeDays },
        } = settings.settingsData;

        // If reassign on not seen is disabled, do nothing.
        if (!reAssignOnSeen) {
            console.log('Reassign on not seen is disabled');
            console.timeEnd('reAssignOnNotSeen');
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

        // 3. Fetch only those leads that haven't been seen and
        // whose lastAssigned is older than the threshold.
        const now = new Date();
        const threshold = new Date(now.getTime() - messageSeenTimeMin * 60 * 1000);
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const leads = await Lead.find({
            repliedFromSystem: false,
            messagesSeen: false,
            status: { $in: ['New', 'Number Collected'] },
            source: 'Facebook',
            lastAssigned: { $lte: threshold },
            createdAt: {
                $gte: last24Hours,
            },
        });
        console.log(`Found ${leads.length} leads for reassignment (not seen).`);

        let reAssignedCount = 0;

        // 4. Process each lead.
        for (const lead of leads) {
            try {
                // Exclude the currently assigned CRE.
                const remainingCREs = creIds.filter(
                    ({ creId }) => creId.toString() !== (lead.creName && lead.creName.toString())
                );
                if (remainingCREs.length === 0) continue;

                // Define the performance window start date.
                const windowStartDate = new Date(performanceRangeDays);

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
                    // Update the lead with the new CRE and update lastAssigned to now.
                    const savedLead = await Lead.findByIdAndUpdate(
                        lead._id,
                        { creName: selectedCRE.creId, lastAssigned: now },
                        { new: true }
                    );
                    // eslint-disable-next-line no-plusplus
                    reAssignedCount++;
                    console.log(`Lead ${reAssignedCount} reassigned to CRE ${selectedCRE.name}`);

                    // Emit socket events for the new assignment.
                    emitSocketEventsForNewMessage(io, savedLead, savedLead.pageInfo);
                }
            } catch (leadError) {
                console.error(`Error processing lead ${lead._id}:`, leadError.message);
                continue;
            }
        }
        console.log(`Total leads reassigned: ${reAssignedCount}`);
    } catch (error) {
        console.error('Error in reAssignOnNotSeen:', error.message);
        throw error;
    }
    console.timeEnd('reAssignOnNotSeen');
};

module.exports = {
    reAssignOnNotSeen,
};
