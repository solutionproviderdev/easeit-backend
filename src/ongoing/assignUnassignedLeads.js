const { getPerformanceBasedCRE } = require('../helpers/getPerformanceBasedCRE');
const Lead = require('../schemas/LeadsSchema');

/* eslint-disable no-restricted-syntax */
const assignUnassignedLeads = async () => {
    try {
        // Find all leads where creName is null or undefined
        const unassignedLeads = await Lead.find({ creName: { $exists: false } });

        if (unassignedLeads.length === 0) {
            console.log('No unassigned leads found.');
            return;
        }

        console.log(`Found ${unassignedLeads.length} unassigned leads.`);

        // Assign each unassigned lead to a CRE
        for (const lead of unassignedLeads) {
            // eslint-disable-next-line no-await-in-loop
            const creId = await getPerformanceBasedCRE();

            if (creId) {
                lead.creName = creId;
                // eslint-disable-next-line no-await-in-loop
                await lead.save();
                console.log(`Assigned lead ${lead._id} to CRE ${creId}.`);
            } else {
                console.warn('No CRE available to assign.');
            }
        }
    } catch (error) {
        console.error('Error assigning unassigned leads:', error);
    }
};

module.exports = {
    assignUnassignedLeads,
};
