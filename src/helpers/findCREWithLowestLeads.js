/* eslint-disable operator-linebreak */
/* eslint-disable no-plusplus */
const People = require('../schemas/PeopleSchema');
const Lead = require('../schemas/LeadsSchema');

const findCREWithLowestLeads = async () => {
    try {
        // Retrieve all CREs
        const cres = await People.find({ department: 'CRE', active: true }).select('name');

        // If no CREs found, return null
        if (!cres || cres.length === 0) return null;

        // Create an object to hold lead counts for each CRE
        const creLeadCounts = {};

        // Initialize the lead count for each CRE
        cres.forEach((cre) => {
            creLeadCounts[cre.name] = 0;
        });

        // Count the leads for each CRE
        const leads = await Lead.find({ creName: { $ne: 'Un Assigned' } });
        leads.forEach((lead) => {
            if (creLeadCounts[lead.creName] !== undefined) {
                creLeadCounts[lead.creName]++;
            }
        });

        // Find the CRE with the lowest number of leads
        let minLeadCre = null;
        let minLeadCount = Infinity;
        Object.entries(creLeadCounts).forEach(([creName, leadCount]) => {
            if (leadCount < minLeadCount) {
                minLeadCount = leadCount;
                minLeadCre = creName;
            }
        });

        // If all CREs have equal lead counts or no leads, randomly select a CRE
        if (
            minLeadCre === null ||
            Object.values(creLeadCounts).every((count) => count === minLeadCount)
        ) {
            minLeadCre = cres[Math.floor(Math.random() * cres.length)].name;
        }

        return minLeadCre;
    } catch (error) {
        console.error('Error finding CRE with lowest leads:', error);
        throw error;
    }
};

module.exports = findCREWithLowestLeads;
