/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
const mongoose = require('mongoose');
const faker = require('@faker-js/faker');
const fs = require('fs');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const User = require('./src/schemas/UserSchema');
const Department = require('./src/schemas/DepartmentSchema');
const Lead = require('./src/schemas/LeadsSchema');

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

    const automatedPattern =
        /(replied to|automated welcome message|add comment|assigned this|change or remove|visit messaging settings|You are responding|comment to)/;

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

// Export all the functions as a module
module.exports = {
    generateDepartments,
    generateRoles,
    generatePermissions,
    generateUsers,
    populateDatabase,
    generateRandomReminder,
    getRandomStatus,
    generateRandomDate,
    updateUnreadLeadsToNew,
    generateAllLeadsMessagesCsv,
    isAutomatedMessage,
    logAutomatedMessages,
    updateAutomatedMessages,
};
