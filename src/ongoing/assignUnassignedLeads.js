/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { default: mongoose } = require('mongoose');
const { getPerformanceBasedCRE } = require('../helpers/getPerformanceBasedCRE');
const Lead = require('../schemas/LeadsSchema');
const User = require('../schemas/auth/UserSchema'); // Import User schema for CRE details

const assignUnassignedLeads = async (io) => {
    try {
        // Step 1: Find leads where creName is null or does not reference an existing user
        const invalidLeads = await Lead.aggregate([
            {
                $lookup: {
                    from: 'users', // Collection name in MongoDB for User model
                    localField: 'creName',
                    foreignField: '_id',
                    as: 'userExists',
                },
            },
            {
                $match: {
                    $or: [
                        { creName: null },
                        { creName: { $exists: false } },
                        { userExists: { $size: 0 } },
                    ],
                },
            },
        ]);

        if (invalidLeads.length === 0) {
            console.log('No unassigned or invalid leads found.');
            return;
        }

        console.log(`Found ${invalidLeads.length} unassigned or invalid leads.`);

        // Step 2: Assign a new creName to each invalid lead
        const leadsToUpdate = [];
        for (const lead of invalidLeads) {
            const creId = await getPerformanceBasedCRE();

            if (creId) {
                // Ensure that the creId is a valid ObjectId
                if (!mongoose.Types.ObjectId.isValid(creId)) {
                    console.error(`Invalid creId: ${creId} for lead ${lead._id}`);
                    continue;
                }

                leadsToUpdate.push({
                    updateOne: {
                        filter: { _id: lead._id },
                        update: { $set: { creName: creId } },
                    },
                });
                console.log(`Assigned lead ${lead._id} to CRE ${creId}.`);

                // Fetch the updated lead and CRE details
                const updatedLead = await Lead.findById(lead._id)
                    .populate('creName', 'name profilePicture')
                    .lean();

                // Emit a socket event for the assigned lead
                if (updatedLead) {
                    io.emit('leadAssigned', {
                        leadId: updatedLead._id,
                        creName: {
                            _id: updatedLead.creName._id,
                            name: updatedLead.creName.name,
                            profilePicture: updatedLead.creName.profilePicture,
                        },
                        leadDetails: {
                            name: updatedLead.name,
                            status: updatedLead.status,
                            lastMessage:
                                // eslint-disable-next-line prettier/prettier
                                updatedLead.messages[updatedLead.messages.length - 1]?.content || 'sent an attachment',
                            lastMessageTime:
                                updatedLead.messages[updatedLead.messages.length - 1]?.date || '',
                            pageInfo: updatedLead.pageInfo,
                        },
                    });
                }
            } else {
                console.warn(`No CRE available to assign for lead ${lead._id}.`);
            }
        }

        // Step 3: Perform bulk update to improve efficiency
        if (leadsToUpdate.length > 0) {
            await Lead.bulkWrite(leadsToUpdate);
            console.log(`Updated ${leadsToUpdate.length} leads.`);
        }
    } catch (error) {
        console.error('Error assigning unassigned or invalid leads:', error);
    }
};

module.exports = {
    assignUnassignedLeads,
};
