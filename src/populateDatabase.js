// name based lead assign
const nameBasedLeadAssign = async () => {
    console.log('\n=== Name Based Lead Assignment Started ===');
    try {
        const oneDayEgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const leads = await Lead.find({
            source: 'Facebook',
            // createdAt: { $gte: oneDayEgo },
        }).select('messages creName');

        console.log(`1. Total Facebook leads found: ${leads.length}`);
        if (leads.length === 0) {
            console.log('No leads to process. Exiting...');
            return;
        }

        const creCRMNamesToFacebookNames = {
            'Morium Ritu': 'Morium Ritu',
            'Antika Sadia Islam': 'Antika Sadia Islam',
            'আরিহা তানিয়া ইসলাম': 'Ariha Taniya Islam',
            'Joynob Islam': 'Joynob Islam',
            'Sumaia Akter Aysa': 'Sumaiya Akter',
            'Faima Kanïz Shorna': 'Faima Kanij Shorna',
        };
        console.log(`2. CRE name mappings loaded: ${Object.keys(creCRMNamesToFacebookNames).length} mappings`);

        const normalizeName = (name) => name
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/[^a-zA-Z\u0980-\u09FF\s]/gu, '')
                .trim();

        const creDepartment = await Department.findOne({ departmentName: 'CRE' });
        if (!creDepartment) {
            console.log('Error: CRE department not found');
            throw new Error('CRE department not found.');
        }
        console.log('3. CRE department found');

        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            console.log('Error: CRE role not found');
            throw new Error('CRE role not found in department.');
        }
        console.log('4. CRE role found');

        const creUsers = await User.find({ roleId: creRole._id }).select('_id nameAsPerNID');
        if (creUsers.length === 0) {
            console.log('Error: No CRE users found');
            throw new Error('No CRE users found.');
        }
        console.log(`5. Active CRE users found: ${creUsers.length}`);

        const creNameToIdMap = creUsers.reduce((map, user) => {
            map[user.nameAsPerNID] = user._id.toString();
            return map;
        }, {});
        console.log(`6. CRE name to ID map created with ${Object.keys(creNameToIdMap).length} entries`);

        const bulkOperations = [];
        let processedLeads = 0;
        let skippedLeads = 0;
        let matchedLeads = 0;

        leads.forEach((lead) => {
            processedLeads++;
            const automatedMessage = lead.messages.filter((message) => /assigned this conversation to/.test(message?.content));

            if (automatedMessage.length > 0) {
                const assigneeNameMatch = automatedMessage[
                    automatedMessage.length - 1
                ].content.match(/assigned this conversation to (.+)$/);

                if (assigneeNameMatch) {
                    matchedLeads++;
                } else {
                    skippedLeads++;
                }
                // ... rest of the code remains the same