const mongoose = require('mongoose');
const Lead = require('../schemas/LeadsSchema'); // Assuming this is your Lead schema
const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');

const findCREWithLowestLeads = async () => {
    try {
        // Fetch the CRE department and its roles
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        }).select('roles');

        if (!creDepartment || creDepartment.roles.length === 0) {
            return null; // No CRE roles found in the department
        }

        // Retrieve the specific roleId for "CRE" role within the CRE department
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');

        if (!creRole) {
            return null; // No specific "CRE" role found
        }

        // Retrieve all active users with the "CRE" role in the "CRE" department
        const cres = await User.find({
            departmentId: creDepartment._id,
            roleId: creRole._id,
            status: 'Active', // Active users only
        }).select('_id');

        if (!cres || cres.length === 0) return null;

        // Map CRE IDs for use in aggregation
        const creIds = cres.map((cre) => cre._id.toString());

        // Aggregate to count the number of leads for each CRE
        const leadCounts = await Lead.aggregate([
            {
                $match: {
                    creName: { $in: creIds.map((id) => new mongoose.Types.ObjectId(id)) },
                },
            },
            { $group: { _id: '$creName', count: { $sum: 1 } } },
            { $sort: { count: 1 } },
        ]);

        // Find the minimum lead count
        const minLeadCount = leadCounts.length > 0 ? leadCounts[0].count : 0;

        // Filter CREs with the minimum lead count
        const minLeadCREs = leadCounts.filter((lc) => lc.count === minLeadCount);

        // Include CREs with no leads (i.e., not present in leadCounts)
        const creWithNoLeads = creIds.filter(
            (id) => !leadCounts.find((lc) => lc._id.toString() === id)
        );
        creWithNoLeads.forEach((id) => {
            minLeadCREs.push({ _id: new mongoose.Types.ObjectId(id), count: 0 });
        });

        // Randomly select one CRE from those with the minimum lead count
        const selectedCRE = minLeadCREs[Math.floor(Math.random() * minLeadCREs.length)];

        return selectedCRE._id;
    } catch (error) {
        console.error('Error finding CRE with lowest leads:', error);
        throw error;
    }
};

module.exports = findCREWithLowestLeads;
