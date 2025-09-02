const Department = require('../schemas/auth/DepartmentSchema');
const User = require('../schemas/auth/UserSchema');

const getNameBasedCRE = async (facebookName) => {
    try {
        // Step 1: Define the mapping from CRM names to Facebook names
        const creCRMNamesToFacebookNames = {
            'Morium Ritu': 'Morium Ritu',
            'Antika Sadia Islam': 'Antika Sadia Islam',
            'আরিহা তানিয়া ইসলাম': 'Ariha Taniya Islam',
        };

        // Helper function to normalize names
        const normalizeName = (name) => name
                .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
                .replace(/[^a-zA-Z\u0980-\u09FF\s]/gu, '') // Remove non-Bangla, non-English letters and non-spaces
                .trim(); // Trim leading/trailing whitespace

        // Step 2: Normalize the input Facebook name
        const normalizedFacebookName = normalizeName(facebookName);

        // Step 3: Find the corresponding CRM name
        const crmName = Object.keys(creCRMNamesToFacebookNames).find(
            (key) => creCRMNamesToFacebookNames[key] === normalizedFacebookName
        );

        if (!crmName) {
            console.warn(`No CRM name found for Facebook name: ${normalizedFacebookName}`);
            return null;
        }

        // Step 4: Fetch CRE department and role
        const creDepartment = await Department.findOne({ departmentName: 'CRE' });
        if (!creDepartment) throw new Error('CRE department not found.');

        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) throw new Error('CRE role not found in department.');

        // Step 5: Fetch all active CRE users
        const creUsers = await User.find({
            roleId: creRole._id,
            status: 'Active',
        }).select('_id nameAsPerNID');
        if (creUsers.length === 0) throw new Error('No active CRE users found.');

        // Create a map for quick lookup of CRE users by CRM name
        const creNameToIdMap = creUsers.reduce((map, user) => {
            map[user.nameAsPerNID] = user._id.toString();
            return map;
        }, {});

        // Step 6: Get the CRE ID from the CRM name
        const creId = creNameToIdMap[crmName];
        if (!creId) {
            console.warn(`CRM Name ${crmName} is not available in the database.`);
            return null;
        }

        // console.log(`Found CRE ID ${creId} for CRM Name ${crmName}`);
        return creId;
    } catch (error) {
        // console.error('Error in getNameBasedCRE:', error.message);
        return null;
    }
};

module.exports = {
    getNameBasedCRE,
};
