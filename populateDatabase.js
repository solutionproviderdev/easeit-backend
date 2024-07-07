/* eslint-disable no-use-before-define */
const mongoose = require('mongoose');
const faker = require('@faker-js/faker');
const User = require('./src/schemas/UserSchema');
const Department = require('./src/schemas/DepartmentSchema');

mongoose.connect('mongodb://localhost:27017/easeit', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
    populateDatabase(); // Call the populate function once connected
});

mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
});

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
