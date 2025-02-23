/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { default: mongoose } = require('mongoose');
const { getPerformanceBasedCRE } = require('../helpers/getPerformanceBasedCRE');
const Lead = require('../schemas/LeadsSchema');
const User = require('../schemas/auth/UserSchema'); // Import User schema for CRE details

// Get CRE information
const getCreInfo = async (id) => {
    try {
        const cre = await User.findOne({ _id: id });
        return cre || null;
    } catch (error) {
        console.error(`Error fetching CRE info for ID ${id}:`, error);
        return null;
    }
};

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

        // console.log(`Found ${invalidLeads.length} unassigned or invalid leads.`);

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

                // Fetch the CRE information
                const creInfo = await getCreInfo(creId);

                if (!creInfo) {
                    console.warn(`CRE not found for ID ${creId}.`);
                    continue;
                }

                console.log(`Assigned lead ${lead._id} to CRE ${creId} (${creInfo.nameAsPerNID}).`);

                // Fetch the updated lead
                const updatedLead = await Lead.findById(lead._id)
                    .populate('creName', 'nameAsPerNID profilePicture')
                    .lean();

                console.log('CRE', updatedLead.creName);

                // Emit a socket event for the assigned lead
                if (updatedLead) {
                    const creName = {
                        _id: creInfo._id,
                        name: creInfo.nameAsPerNID,
                        profilePicture: creInfo.profilePicture,
                    };

                    io.emit('leadAssigned', {
                        leadId: updatedLead._id,
                        creName, // Use the creName object
                        leadDetails: {
                            name: updatedLead.name,
                            status: updatedLead.status,
                            lastMessage:
                                updatedLead.messages[updatedLead.messages.length - 1]?.content
                                || 'sent an attachment',
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
