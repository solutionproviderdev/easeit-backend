const Lead = require('../schemas/LeadsSchema');
const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');
const { notifyNewLeadAssignment } = require('../helpers/notification/lead/leadTriggers');

const nameBasedLeadAssign = async () => {
    // console.log('name based lead assign Stated');
    try {
        const oneDayEgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const leads = await Lead.find({
            source: 'Facebook',
            // createdAt: { $gte: oneDayEgo },
        }).select('messages creName');

        // console.log(`Total leads found: ${leads.length}`);

        if (leads.length === 0) return;

        const creCRMNamesToFacebookNames = {
            // 'Morium Ritu': 'Morium Ritu',
            'আন্তিকা সাদিয়া ইসলাম': 'Antika Sadia Islam',
            'Nazmul SP': 'Ariha Taniya Islam',
            // 'Joynob Islam': 'Joynob Islam',
            'Sumaia Akter Aysa': 'Sumaiya Akter',
            // 'Faima Kanz Shorna': 'Faima Kanij Shorna',
        };

        const normalizeName = (name) => name
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[^a-zA-Z\u0980-\u09FF\s]/gu, '')
            .trim();

        const creDepartment = await Department.findOne({ departmentName: 'CRE' });
        if (!creDepartment) throw new Error('CRE department not found.');

        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) throw new Error('CRE role not found in department.');

        const creUsers = await User.find({ roleId: creRole._id }).select('_id nameAsPerNID');
        if (creUsers.length === 0) throw new Error('No CRE users found.');

        const creNameToIdMap = creUsers.reduce((acc, user) => {
            acc[user.nameAsPerNID] = user._id.toString();
            return acc;
        }, {});

        const bulkOperations = [];
        let updatedLeads = 0;
        let matchedLeads = 0;
        let unmatchedLeads = 0;

        leads.forEach((lead) => {
            const automatedMessage = lead.messages.filter((message) =>
                /assigned this conversation to/.test(message?.content));

            if (automatedMessage.length > 0) {
                matchedLeads += 1;

                const assigneeNameMatch = automatedMessage[
                    automatedMessage.length - 1
                ].content.match(/assigned this conversation to (.+)$/);

                const facebookName = assigneeNameMatch ? normalizeName(assigneeNameMatch[1]) : null;
                if (!facebookName) return;

                const crmName = creCRMNamesToFacebookNames[facebookName];
                const creId = creNameToIdMap[crmName];
                if (!creId) return;

                // Check if the Facebook name is not in the keys of creCRMNamesToFacebookNames
                if (
                    !Object.prototype.hasOwnProperty.call(creCRMNamesToFacebookNames, facebookName)
                ) {
                    // Log the new Facebook name that is not in the creCRMNamesToFacebookNames object
                    console.log(
                        `New Facebook name found that is not in creCRMNamesToFacebookNames: ${facebookName}`
                    );
                }

                if (lead.creName?.toString() === creId) return;

                // send notification to user
                notifyNewLeadAssignment(lead._id, creId);

                bulkOperations.push({
                    updateOne: {
                        filter: { _id: lead._id },
                        update: { $set: { creName: creId } },
                    },
                });

                updatedLeads += 1;
            } else {
                unmatchedLeads += 1;
            }
        });

        // console.log(`Total matched leads: ${matchedLeads}`);
        // console.log(`Total unmatched leads: ${unmatchedLeads}`);
        // console.log(`Total leads updated: ${updatedLeads}`);

        if (bulkOperations.length > 0) {
            await Lead.bulkWrite(bulkOperations);
        }
    } catch (error) {
        console.error('Error in nameBasedLeadAssign:', error.message);
    }
};

const findDuplicateLeads = async () => {
    try {
        // Group leads by pageInfo.pageId and pageInfo.fbSenderID where both exist
        const duplicates = await Lead.aggregate([
            {
                $match: {
                    'pageInfo.pageId': { $exists: true, $ne: null },
                    'pageInfo.fbSenderID': { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: {
                        pageId: '$pageInfo.pageId',
                        fbSenderID: '$pageInfo.fbSenderID',
                    },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                },
            },
            {
                $match: {
                    count: { $gt: 1 },
                },
            },
        ]);

        const deletePromises = duplicates.map(async (group) => {
            // Keep the first id and delete the rest
            const idsToDelete = group.ids.slice(1);
            const result = await Lead.deleteMany({ _id: { $in: idsToDelete } });
            return result.deletedCount || 0;
        });

        const deletedCounts = await Promise.all(deletePromises);
        const totalDeleted = deletedCounts.reduce((sum, count) => sum + count, 0);
    } catch (error) {
        console.error('Error finding duplicate leads:', error);
    }
};

module.exports = {
    nameBasedLeadAssign,
    findDuplicateLeads,
};