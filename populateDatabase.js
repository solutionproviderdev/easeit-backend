/* eslint-disable no-lonely-if */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
const mongoose = require('mongoose');
const fs = require('fs');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('./src/schemas/LeadsSchema');
const Department = require('./src/schemas/auth/DepartmentSchema');
const User = require('./src/schemas/auth/UserSchema');
const findCREWithLowestLeads = require('./src/helpers/findCREWithLowestLeads');
const { getPerformanceBasedCRE } = require('./src/helpers/getPerformanceBasedCRE');
const Meeting = require('./src/schemas/MeetingSchema');

// Function to generate random departments
const generateDepartments = (num) => {
    const departments = [];
    for (let i = 0; i < num; i++) {
        const roles = generateRoles(faker.datatype.number({ min: 1, max: 5 }));
        departments.push({
            departmentName: faker.commerce.department(),
            description: faker.lorem.sentence(),
            roles,
        });
    }
    return departments;
};

// Function to generate random roles
const generateRoles = (num) => {
    const roles = [];
    for (let i = 0; i < num; i++) {
        roles.push({
            roleName: faker.name.jobTitle(),
            description: faker.lorem.sentence(),
            permissions: generatePermissions(faker.datatype.number({ min: 1, max: 3 })),
        });
    }
    return roles;
};

// Function to generate random permissions
const generatePermissions = (num) => {
    const permissions = [];
    const actions = ['create', 'read', 'update', 'delete'];
    for (let i = 0; i < num; i++) {
        permissions.push({
            resource: faker.commerce.product(),
            action: faker.random.arrayElement(actions),
        });
    }
    return permissions;
};

// Function to generate random users
const generateUsers = async (num, departments) => {
    const users = [];
    for (let i = 0; i < num; i++) {
        const department = faker.random.arrayElement(departments);
        const role = faker.random.arrayElement(department.roles);
        users.push({
            nameAsPerNID: faker.name.findName(),
            nickname: faker.internet.userName(),
            email: faker.internet.email(),
            personalPhone: faker.phone.phoneNumber(),
            officePhone: faker.phone.phoneNumber(),
            gender: faker.random.arrayElement(['Male', 'Female', 'Other']),
            address: faker.address.streetAddress(),
            password: faker.internet.password(),
            status: faker.random.arrayElement(['Active', 'Inactive']),
            roleId: role._id,
            departmentId: department._id,
            type: faker.random.arrayElement(['Admin', 'Operator']),
            accessLevel: ['read', 'write'],
            joiningDate: faker.date.past(),
            currentSalary: faker.datatype.number({ min: 30000, max: 120000 }),
            workingProcedure: faker.lorem.sentence(),
            documents: {
                resume: faker.internet.url(),
                nidCopy: faker.internet.url(),
                academicDocument: faker.internet.url(),
                bankAccountNumber: faker.finance.account(),
                agreement: faker.internet.url(),
            },
            activityLog: [
                {
                    activity: faker.lorem.sentence(),
                },
            ],
            socialLinks: [
                {
                    platform: 'LinkedIn',
                    link: faker.internet.url(),
                },
            ],
            guardian: {
                name: faker.name.findName(),
                phone: faker.phone.phoneNumber(),
                relation: faker.random.arrayElement(['Father', 'Mother', 'Spouse']),
            },
        });
    }
    return users;
};

// Function to populate the database
const populateDatabase = async () => {
    try {
        const numDepartments = 5;
        const numUsers = 20;

        // Clear existing data
        await Department.deleteMany({});
        await User.deleteMany({});

        // Generate and insert departments
        const departments = generateDepartments(numDepartments);
        const insertedDepartments = await Department.insertMany(departments);
        console.log(`Inserted ${insertedDepartments.length} departments`);

        // Generate and insert users
        const users = await generateUsers(numUsers, insertedDepartments);
        const insertedUsers = await User.insertMany(users);
        console.log(`Inserted ${insertedUsers.length} users`);

        mongoose.connection.close();
    } catch (error) {
        console.error(`Error populating database: ${error.message}`);
        mongoose.connection.close();
    }
};

// Function to generate random reminders for leads
const generateRandomReminder = async () => {
    try {
        const leads = await Lead.find();

        if (!leads.length) {
            console.log('No leads found in the collection');
            return;
        }

        for (const lead of leads) {
            const randomReminder = {
                time: generateRandomDate(),
                status: getRandomStatus(),
                commentId: new mongoose.Types.ObjectId(),
            };

            lead.reminder.push(randomReminder);
            await lead.save();
            console.log(`Reminder added to lead ${lead.name}`);
        }
        console.log('All reminders added successfully!');
    } catch (error) {
        console.error('Error generating random reminders:', error.message);
    }
};

// Function to generate a random status
const getRandomStatus = () => {
    const statuses = ['Pending', 'Complete', 'Missed'];
    const randomIndex = Math.floor(Math.random() * statuses.length);
    return statuses[randomIndex];
};

// Function to generate a random date within the last 30 days
const generateRandomDate = () => {
    const daysAgo = Math.floor(Math.random() * 30);
    return dayjs().subtract(daysAgo, 'day').toDate();
};

// Function to update unread leads to 'New'
const updateUnreadLeadsToNew = async () => {
    try {
        const result = await Lead.updateMany({ status: 'unread' }, { $set: { status: 'New' } });

        console.log(`Updated ${result.modifiedCount} leads.`);
    } catch (error) {
        console.error('Error updating leads:', error.message);
    }
};

// Function to generate CSV for all leads
const generateAllLeadsMessagesCsv = async () => {
    try {
        const leads = await Lead.find();

        if (!leads || leads.length === 0) {
            console.log('No leads found');
            return;
        }

        const csvData = [];

        leads.forEach((lead) => {
            const messagesByUs = lead.messages.filter((msg) => msg.sentByMe);
            const messagesByCustomer = lead.messages.filter((msg) => !msg.sentByMe);

            const maxLength = Math.max(messagesByUs.length, messagesByCustomer.length);

            for (let i = 0; i < maxLength; i++) {
                csvData.push({
                    leadId: lead._id,
                    leadName: lead.name,
                    messageByUs: messagesByUs[i] ? messagesByUs[i].content : '',
                    messageByCustomer: messagesByCustomer[i] ? messagesByCustomer[i].content : '',
                });
            }
        });

        const fields = ['leadId', 'leadName', 'messageByUs', 'messageByCustomer'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(csvData);

        fs.writeFileSync('all_leads_messages.csv', csv);
        console.log('CSV file for all leads created successfully!');
    } catch (error) {
        console.error('Error generating CSV for all leads:', error);
    }
};

// Function to determine if a message is automated
const isAutomatedMessage = (message) => {
    const lowerCaseMessage = message.toLowerCase();

    // Add a pattern to detect the message "You can call [name] back within the next 7 days."
    // Also add a pattern for "Auto-detected outcome" and "added an Intake label"
    const automatedPattern =
        /(replied to|automated welcome message|you missed a call from|back within the next 7 days.|automated activity was created|add comment|assigned this|change or remove|visit messaging settings|you are responding|comment to|called you|you can call\s+([a-zA-Z]+\s?){1,3}\s+back within the next 7 days\.|auto-detected outcome.*added an intake label)/;

    return automatedPattern.test(lowerCaseMessage);
};

// Function to log automated messages
const logAutomatedMessages = async () => {
    try {
        const leads = await Lead.find({});
        leads.forEach((lead) => {
            lead.messages.forEach((message) => {
                if (isAutomatedMessage(message.content)) {
                    console.log(`Lead ID: ${lead._id}, Message: ${message.content}`);
                }
            });
        });
    } catch (error) {
        console.error('Error reading messages:', error);
    }
};

// Function to update the 'isAutomatedMessage' field in the database
const updateAutomatedMessages = async () => {
    try {
        const leads = await Lead.find({});
        for (const lead of leads) {
            let isUpdated = false;

            lead.messages.forEach((message) => {
                const isAutomated = isAutomatedMessage(message.content);
                if (message.isAutomatedMessage !== isAutomated) {
                    message.isAutomatedMessage = isAutomated;
                    isUpdated = true;
                }
            });

            if (isUpdated) {
                await lead.save();
                console.log(`Lead ID: ${lead._id} has been updated.`);
            }
        }
        console.log('Automated message update process completed.');
    } catch (error) {
        console.error('Error updating automated messages:', error);
    }
};

// Function to determine if a message contains a high-quality lead tag
const isHighQualityLeadMessage = (message) => {
    const lowerCaseMessage = message.toLowerCase();
    const highQualityPattern = /auto-detected outcome.*added an intake label/;
    return highQualityPattern.test(lowerCaseMessage);
};

// Function to find and log leads with high-quality mentions
const findHighQualityLeads = async () => {
    try {
        // Fetch all leads from the database
        const leads = await Lead.find();

        let totalHighQualityLeads = 0;
        const highQualityLeads = [];

        // Iterate over each lead
        leads.forEach((lead) => {
            // Check if any message contains the high-quality tag
            const hasHighQualityMessage = lead.messages.some((message) => isHighQualityLeadMessage(message.content));

            // If a high-quality message is found, log the lead's name and phone numbers
            if (hasHighQualityMessage) {
                highQualityLeads.push({
                    name: lead.name,
                    phone:
                        lead.phone && lead.phone.length > 0
                            ? lead.phone.join(', ')
                            : 'No phone number available',
                });
                totalHighQualityLeads++;
            }
        });

        // Log high-quality leads using console.table
        if (highQualityLeads.length > 0) {
            console.table(highQualityLeads);
        } else {
            console.log('No high-quality leads found.');
        }

        console.log(`Total High-Quality Leads: ${totalHighQualityLeads}`);
    } catch (error) {
        console.error('Error fetching leads:', error);
    }
};

// Function to create dummy departments, roles, and users
const createDummyUsers = async () => {
    try {
        // Create dummy departments with updated schema structure
        const departments = [
            {
                departmentName: 'Sales',
                description: 'Sales Department',
                roles: [
                    {
                        roleName: 'Sales Manager',
                        description: 'Handles sales operations',
                        permissions: [
                            {
                                resource: 'leads',
                                actions: [
                                    { name: 'create', allowed: true },
                                    { name: 'update', allowed: true },
                                    { name: 'delete', allowed: true },
                                ],
                            },
                        ],
                    },
                    {
                        roleName: 'Sales Associate',
                        description: 'Assists in sales',
                        permissions: [
                            {
                                resource: 'leads',
                                actions: [
                                    { name: 'create', allowed: true },
                                    { name: 'update', allowed: false },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                departmentName: 'Marketing',
                description: 'Marketing Department',
                roles: [
                    {
                        roleName: 'Marketing Head',
                        description: 'Leads the marketing team',
                        permissions: [
                            {
                                resource: 'campaigns',
                                actions: [
                                    { name: 'create', allowed: true },
                                    { name: 'update', allowed: true },
                                    { name: 'delete', allowed: true },
                                ],
                            },
                        ],
                    },
                    {
                        roleName: 'Marketing Associate',
                        description: 'Assists with marketing campaigns',
                        permissions: [
                            {
                                resource: 'campaigns',
                                actions: [
                                    { name: 'create', allowed: true },
                                    { name: 'update', allowed: false },
                                ],
                            },
                        ],
                    },
                ],
            },
        ];

        // Insert departments into the database
        const createdDepartments = await Department.insertMany(departments);

        // Create dummy users based on the created departments and roles
        for (let i = 0; i < 10; i++) {
            const department = faker.helpers.arrayElement(createdDepartments);
            const role = faker.helpers.arrayElement(department.roles);
            const password = await bcrypt.hash('password', 10);

            const user = new User({
                nameAsPerNID: `${faker.name.firstName()} ${faker.name.lastName()}`,
                nickname: faker.internet.userName(),
                email: faker.internet.email(),
                personalPhone: faker.phone.phoneNumber(),
                officePhone: faker.phone.phoneNumber(),
                gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
                address: faker.address.streetAddress(),
                profilePicture: faker.image.avatar(),
                coverPhoto: faker.image.imageUrl(),
                password,
                status: faker.helpers.arrayElement(['Active', 'Inactive']),
                roleId: role._id, // Reference the role ID from the department
                departmentId: department._id, // Reference the department ID
                type: faker.helpers.arrayElement(['Admin', 'Operator']),
                accessLevel: faker.helpers.arrayElements(['read', 'write', 'delete'], 2),
                joiningDate: faker.date.past(),
                currentSalary: faker.finance.amount(),
                workingProcedure: faker.lorem.sentence(),
                documents: {
                    resume: faker.internet.url(),
                    nidCopy: faker.internet.url(),
                    academicDocument: faker.internet.url(),
                    bankAccountNumber: faker.finance.account(),
                    agreement: faker.internet.url(),
                },
                activityLog: [
                    {
                        activity: faker.lorem.sentence(),
                    },
                ],
                socialLinks: [
                    {
                        platform: 'Facebook',
                        link: faker.internet.url(),
                    },
                ],
                guardian: {
                    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
                    phone: faker.phone.phoneNumber(),
                    relation: faker.helpers.arrayElement(['Father', 'Mother', 'Guardian']),
                },
            });

            await user.save(); // Save each user individually
        }

        console.log('Dummy data created successfully!');
    } catch (error) {
        console.error('Error creating dummy data:', error);
    }
};

const assignLeadsToCRE = async () => {
    try {
        // Find all leads that do not have an assigned CRE
        const unassignedLeads = await Lead.find();

        if (unassignedLeads.length === 0) {
            console.log('No unassigned leads found.');
            return;
        }

        // Loop through each unassigned lead
        for (const lead of unassignedLeads) {
            // Find a CRE with the lowest number of leads
            const creId = await getPerformanceBasedCRE();

            if (!creId) {
                console.error('No CRE available for assignment.');
                continue;
            }

            // Assign the lead to the selected CRE
            lead.creName = creId;

            // Save the updated lead
            await lead.save();

            console.log(`Assigned lead ${lead._id} to CRE ${creId}`);
        }

        console.log('Lead assignment to CRE completed.');
    } catch (error) {
        console.error('Error assigning leads to CRE:', error);
        throw error;
    }
};

// Convert Bengali numerals to English numerals
const convertBengaliToEnglishNumbers = (input) => {
    const bengaliToEnglishMap = {
        '০': '0',
        '১': '1',
        '২': '2',
        '৩': '3',
        '৪': '4',
        '৫': '5',
        '৬': '6',
        '৭': '7',
        '৮': '8',
        '৯': '9',
    };
    return input.replace(/[০১২৩৪৫৬৭৮৯]/g, (match) => bengaliToEnglishMap[match]);
};

// Function to check and update phone numbers for all leads
const updateLeadsWithPhoneNumbers = async () => {
    try {
        const leads = await Lead.find({});

        for (const lead of leads) {
            let newPhoneAdded = false;

            for (const message of lead.messages) {
                if (message.sentByMe !== true) {
                    const content = convertBengaliToEnglishNumbers(message.content);
                    const potentialNumber = content.replace(/[^0-9]+/g, '');

                    if (potentialNumber) {
                        const parsedNumber = parsePhoneNumberFromString(potentialNumber, 'BD');

                        // Check if the parsed number is valid and not already in the phone array
                        if (parsedNumber && parsedNumber.isValid()) {
                            const formattedNumber = parsedNumber.formatInternational();

                            if (!lead.phone.includes(formattedNumber)) {
                                lead.phone.push(formattedNumber);
                                newPhoneAdded = true;
                            }
                        }
                    }
                }
            }

            // Update lead status if a new phone number was added
            if (newPhoneAdded) {
                lead.status = 'Number Collected';
                await lead.save();
                console.log(`Updated lead ID ${lead._id}: Number collected.`);
            }
        }

        console.log('All leads processed for phone number updates.');
    } catch (error) {
        console.error('Error updating leads with phone numbers:', error);
    }
};

const updateLeadStatusBasedOnPhoneNumber = async () => {
    try {
        // Retrieve all leads
        const leads = await Lead.find();

        for (const lead of leads) {
            if (lead.phone && lead.phone.length > 0) {
                // Lead has phone numbers, check if status needs updating to 'Number Collected'
                if (lead.status !== 'Number Collected') {
                    lead.status = 'Number Collected';
                    await lead.save();
                    console.log(`Lead ID ${lead._id} status updated to 'Number Collected'.`);
                }
            } else {
                // Lead has no phone numbers, check if status is incorrectly set to 'Number Collected'
                if (lead.status === 'Number Collected') {
                    lead.status = 'New';
                    await lead.save();
                    console.log(`Lead ID ${lead._id} status corrected to 'New'.`);
                }
            }
        }

        console.log('Lead statuses updated based on phone number presence.');
    } catch (error) {
        console.error('Error updating lead statuses based on phone number:', error);
    }
};

const updateLeadsStatusToMeetingFixed = async () => {
    try {
        // Retrieve all meetings
        const meetings = await Meeting.find().populate('lead'); // Populate to access lead details

        for (const meeting of meetings) {
            // Check if the lead's status is not already 'Meeting Fixed'
            if (meeting.lead && meeting.lead.status !== 'Meeting Fixed') {
                meeting.lead.status = 'Meeting Fixed'; // Update status
                await meeting.lead.save(); // Save the updated lead
                console.log(`Lead ID ${meeting.lead._id} status updated to 'Meeting Fixed'.`);
            }
        }

        console.log('All relevant lead statuses updated to "Meeting Fixed".');
    } catch (error) {
        console.error('Error updating lead statuses:', error);
    }
};

const updateMeetingStatuses = async () => {
    try {
        // Define a mapping of old status values to new status values
        const statusMapping = {
            'Meeting Fixed': 'Fixed',
            'Meeting Postponed': 'Postponed',
            'Meeting Rescheduled': 'Rescheduled',
            'Meeting Canceled': 'Canceled',
        };

        // Fetch all meetings from the database
        const meetings = await Meeting.find();

        for (const meeting of meetings) {
            // Check if the current status needs to be updated
            if (statusMapping[meeting.status]) {
                // Update the status to the new value
                meeting.status = statusMapping[meeting.status];
                await meeting.save();
                console.log(`Updated meeting ID ${meeting._id} status to '${meeting.status}'.`);
            }
        }

        console.log('All meeting statuses updated successfully.');
    } catch (error) {
        console.error('Error updating meeting statuses:', error);
    }
};

// Helper function to extract valid phone numbers from a message
const extractValidPhoneNumber = (content, countryCode = 'BD') => {
    // Convert Bengali numerals to English and remove non-numeric characters
    const sanitizedContent = convertBengaliToEnglishNumbers(
        content.replace(/[^0-9০১২৩৪৫৬৭৮৯]+/g, '')
    );

    // Validate the number using libphonenumber-js
    if (sanitizedContent) {
        const parsedNumber = parsePhoneNumberFromString(sanitizedContent, countryCode);
        if (parsedNumber && parsedNumber.isValid()) {
            return parsedNumber.formatInternational(); // Return formatted number
        }
    }
    return null;
};

// Unified function to process leads
const updateLeadsWithPhoneNumbersAndStatus = async () => {
    try {
        let totalNewLeadsUpdated = 0; // Count of leads updated to "New"
        let totalNumberCollectedLeadsUpdated = 0; // Count of leads updated to "Number Collected"

        let totalNewLeads = 0; // Total leads with "New" status
        let totalNumberCollectedLeads = 0; // Total leads with "Number Collected" status
        let totalLeads = 0; // Total number of leads

        // Fetch all leads
        const leads = await Lead.find({});
        totalLeads = leads.length;

        for (const lead of leads) {
            let newPhoneAdded = false;

            // Process each message in the lead
            for (const message of lead.messages) {
                if (!message.sentByMe && message.content) {
                    const validPhoneNumber = extractValidPhoneNumber(message.content);
                    if (validPhoneNumber) {
                        // Add the phone number if not already in the lead's phone array
                        if (!lead.phone.includes(validPhoneNumber)) {
                            lead.phone.push(validPhoneNumber);
                            newPhoneAdded = true;
                        }
                    }
                }
            }

            // Update the lead's status based on whether a new phone number was added
            if (newPhoneAdded) {
                if (lead.status !== 'Number Collected') {
                    lead.status = 'Number Collected';
                    totalNumberCollectedLeadsUpdated++;
                }
            } else if (!lead.phone.length && lead.status === 'Number Collected') {
                lead.status = 'New'; // Reset status if no phone numbers are found
                totalNewLeadsUpdated++;
            }

            // Save the updated lead
            await lead.save();
            console.log(`Processed lead ID ${lead._id}: Status updated to '${lead.status}'.`);
        }

        // Fetch total counts of leads by status
        totalNumberCollectedLeads = await Lead.countDocuments({ status: 'Number Collected' });
        totalNewLeads = await Lead.countDocuments({ status: 'New' });

        // Calculate percentages
        const percentNumberCollected = ((totalNumberCollectedLeads / totalLeads) * 100).toFixed(2);
        const percentNew = ((totalNewLeads / totalLeads) * 100).toFixed(2);

        // Log the summary
        console.log(
            `Total leads updated to 'Number Collected': ${totalNumberCollectedLeadsUpdated}`
        );
        console.log(`Total leads updated to 'New': ${totalNewLeadsUpdated}`);
        console.log(
            `Total leads with 'Number Collected' status: ${totalNumberCollectedLeads} (${percentNumberCollected}%)`
        );
        console.log(`Total leads with 'New' status: ${totalNewLeads} (${percentNew}%)`);
        console.log(`Total leads processed: ${totalLeads}`);
        console.log('All leads processed and updated.');
    } catch (error) {
        console.error('Error processing leads for phone number updates:', error);
    }
};

const assignLeadsToCREInOrder = async () => {
	try {
		// Fetch all active CREs
		const creDepartment = await Department.findOne({
			departmentName: 'CRE',
		}).select('roles');

		if (!creDepartment || !creDepartment.roles) {
			throw new Error('CRE department or roles not found');
		}

		// Filter the CRE role from the department roles (excluding CRE Head)
		const creRole = creDepartment.roles.find(role => role.roleName === 'CRE');

		if (!creRole) {
			throw new Error('CRE role not found in department');
		}

		// Retrieve all active CREs with the role 'CRE'
		const activeCREs = await User.find({
			departmentId: creDepartment._id,
			roleId: creRole._id, // Filter by roleId for CRE
			status: 'Active', // Only active users
		}).select('_id');

		if (!activeCREs || activeCREs.length === 0) {
			console.error('No active CREs available for assignment.');
			return;
		}

		const creIds = activeCREs.map(cre => cre._id);

		// Fetch unassigned leads (leads without a CRE assigned)
		const unassignedLeads = await Lead.find();

		if (unassignedLeads.length === 0) {
			console.log('No unassigned leads found.');
			return;
		}

		// Assign leads to CREs in round-robin order
		let creIndex = 0;

		for (const lead of unassignedLeads) {
			// Assign the lead to the current CRE
			lead.creName = creIds[creIndex];

			// Save the updated lead
			await lead.save();

			console.log(`Assigned lead ${lead._id} to CRE ${creIds[creIndex]}`);

			// Move to the next CRE in the list, wrapping around if necessary
			creIndex = (creIndex + 1) % creIds.length;
		}

		console.log('Leads have been assigned to CREs in round-robin order.');
	} catch (error) {
		console.error('Error assigning leads to CREs in order:', error);
		throw error;
	}
};

const deleteLeadsWithInvalidMessageIds = async () => {
	try {
		// Find leads with invalid `_id` values in the `messages` array
		const invalidLeads = await Lead.find({
			'messages._id': { $type: 'number' },
		});

		if (invalidLeads.length === 0) {
			console.log('No leads with invalid message IDs found.');
			return;
		}

		console.log(`Found ${invalidLeads.length} leads with invalid message IDs.`);

		// Delete all invalid leads
		const invalidLeadIds = invalidLeads.map(lead => lead._id);

		await Lead.deleteMany({ _id: { $in: invalidLeadIds } });

		console.log(`Deleted ${invalidLeadIds.length} invalid leads.`);
	} catch (error) {
		console.error(
			'Error deleting leads with invalid message IDs:',
			error.message
		);
	}
};




// Export all the functions as a module
module.exports = {
	generateDepartments,
	generateRoles,
	generatePermissions,
	generateUsers,
	populateDatabase,
	getRandomStatus,
	assignLeadsToCRE,
	createDummyUsers,
	generateRandomDate,
	isAutomatedMessage,
	findHighQualityLeads,
	logAutomatedMessages,
	updateMeetingStatuses,
	generateRandomReminder,
	updateUnreadLeadsToNew,
	updateAutomatedMessages,
	isHighQualityLeadMessage,
	updateLeadsWithPhoneNumbers,
	generateAllLeadsMessagesCsv,
	updateLeadsStatusToMeetingFixed,
	updateLeadStatusBasedOnPhoneNumber,
	updateLeadsWithPhoneNumbersAndStatus,
	assignLeadsToCREInOrder,
	deleteLeadsWithInvalidMessageIds,
};
