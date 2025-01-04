/* eslint-disable no-shadow */
const moment = require('moment');
const User = require('../../schemas/auth/UserSchema');
const Meeting = require('../../schemas/MeetingSchema');
const Lead = require('../../schemas/LeadsSchema');
const Department = require('../../schemas/auth/DepartmentSchema');

// Controller function to get all CREs' performance data
const getAllCREsPerformanceData = async (req, res) => {
    try {
        // Find the department ID for "CRE" department
        const department = await Department.findOne({ departmentName: 'CRE' });
        if (!department) {
            return res.status(404).json({ message: 'CRE department not found' });
        }

        // Find the role ID for "CRE" within the "CRE" department
        const creRole = department.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            return res.status(404).json({ message: 'CRE role not found in CRE department' });
        }

        // Find all users with the roleId of "CRE" role and departmentId of "CRE" department
        const creUsers = await User.find({
            departmentId: department._id,
            roleId: creRole._id,
        });
        if (creUsers.length === 0) {
            return res.status(404).json({ message: 'No CRE users found' });
        }

        // Iterate over each CRE user and calculate their performance data
        const crePerformanceData = await Promise.all(
            creUsers.map(async (user) => {
                // Fetch assigned leads count
                const assigned = await Lead.countDocuments({ creName: user._id });

                // Fetch count of leads with at least one phone number
                const numberCollected = await Lead.countDocuments({
                    creName: user._id,
                    phone: { $exists: true, $not: { $size: 0 } },
                });

                // Fetch meetings set count
                const meetingsSet = await Lead.countDocuments({
                    creName: user._id,
                    status: 'Meeting Fixed',
                });

                // Fetch leads where creName matches the user's ID
                const leadsForUser = await Lead.find({
                    creName: user._id,
                }).select('_id');
                const leadIds = leadsForUser.map((lead) => lead._id);

                // Count meetings for user's leads with status 'Complete' or 'Sold'
                const meetingsCompleted = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: { $in: ['Complete', 'Sold'] },
                });

                // Fetch total sales count

                // Count meetings where the lead is in the above list and status is 'Sold'
                const totalSales = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Sold',
                });

                // Define a target value (example target value, adjust as necessary)
                const target = 150;

                // Calculate performance percentage
                const performancePercentage = Math.round((meetingsCompleted / target) * 100);

                // Return structured performance data for the user
                return {
                    id: user._id.toString(),
                    name: user.nameAsPerNID,
                    role: {
                        roleName: creRole.roleName,
                        departmentName: department.departmentName,
                    },
                    profilePictureUrl: user.profilePicture || null,
                    performanceMetrics: {
                        assigned,
                        numberCollected,
                        meetingsSet,
                        meetingsCompleted,
                        totalSales,
                        target,
                        performancePercentage,
                    },
                };
            })
        );

        res.status(200).json(crePerformanceData);
    } catch (error) {
        console.error('Error fetching CRE performance data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Controller function to get performance data for a specific CRE by ID
const getCREPerformanceDataById = async (req, res) => {
    try {
        const { creId } = req.params;
        console.log(`Fetching performance data for CRE ID: ${creId}`);

        // Find the user by ID and populate department information
        const user = await User.findById(creId).populate('departmentId');
        if (!user) {
            console.log('CRE not found.');
            return res.status(404).json({ message: 'CRE not found' });
        }

        // Ensure the user's department and role match 'CRE'
        const department = await Department.findById(user.departmentId._id);
        const role = department.roles.find(
            (role) => role._id.equals(user.roleId) && role.roleName === 'CRE'
        );
        if (!role) {
            console.log('User is not a CRE.');
            return res.status(400).json({ message: 'User is not a CRE' });
        }

        // Calculate performance metrics
        const assigned = await Lead.countDocuments({ creName: user._id });

        const numberCollected = await Lead.countDocuments({
            creName: user._id,
            phone: { $exists: true, $ne: [] },
        });

        const meetingsSet = await Lead.countDocuments({
            creName: user._id,
            status: 'Meeting Fixed',
        });

        const leadsForUser = await Lead.find({ creName: user._id }).select('_id');
        const leadIds = leadsForUser.map((lead) => lead._id);

        const meetingsCompleted = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: { $in: ['Complete', 'Sold'] },
        });

        const totalSales = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Sold',
        });

        const target = 150;
        const performancePercentage = Math.round((meetingsCompleted / target) * 100);

        // Structure response
        const response = {
            id: user._id.toString(),
            name: user.nameAsPerNID,
            role: {
                roleName: role.roleName,
                departmentName: department.departmentName,
            },
            profilePictureUrl: user.profilePicture || null,
            performanceMetrics: {
                assigned,
                numberCollected,
                meetingsSet,
                meetingsCompleted,
                totalSales,
                target,
                performancePercentage,
            },
        };

        console.log('Returning performance data for the specified CRE.');
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching CRE performance data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Controller function to get monthly/weekly meetings
const getMeetingsData = async (req, res) => {
    try {
        const { timeLength, mode } = req.query;
        const creId = req.user._id; // Assuming CRE's ID is stored in req.user

        // Define date range and initialize days array
        let startDate;
        let endDate;
        let daysArray = [];

        if (timeLength === 'week') {
            // Set start to last Thursday and end to this Wednesday
            startDate = moment().day(4).startOf('day');
            endDate = moment().day(3).add(1, 'week').endOf('day');

            // Initialize days array with each day from Thursday to Wednesday
            daysArray = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
        } else if (timeLength === 'month') {
            // Set start to the beginning of the month and end to the last day of the month
            startDate = moment().startOf('month');
            endDate = moment().endOf('month');

            // Initialize days array with each day of the month as numbers (e.g., 1, 2, ...)
            daysArray = Array.from({ length: endDate.date() }, (_, i) => (i + 1).toString());
        } else {
            return res.status(400).json({ message: 'Invalid time length' });
        }

        // Define match criteria based on mode
        const matchCriteria = {
            date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            ...(mode === 'own' && { salesExecutive: creId }),
        };

        // Query the meetings based on criteria
        const meetings = await Meeting.find(matchCriteria);

        // Initialize groupedMeetings with each day set to 0
        const groupedMeetings = daysArray.reduce((acc, day) => {
            acc[day] = 0;
            return acc;
        }, {});

        // Count meetings and populate groupedMeetings
        meetings.forEach((meeting) => {
            const dayLabel =
                timeLength === 'week'
                    ? moment(meeting.date).format('ddd') // Day of the week (e.g., "Mon")
                    : moment(meeting.date).format('D'); // Day of the month as a number

            groupedMeetings[dayLabel] += 1;
        });

        // Format the response data
        const meetingsData = Object.entries(groupedMeetings).map(([day, value]) => ({
            day,
            value,
        }));

        res.status(200).json({
            timePeriod: timeLength,
            mode,
            meetings: meetingsData,
        });
    } catch (error) {
        console.error('Error fetching meetings data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getNotifications = async (req, res) => {
    try {
        const creId = req.user._id; // Get CRE ID from authenticated user

        // Fetch the user to verify the role and department
        const { user } = req;

        // Fetch the department and role details
        const department = await Department.findById(user.departmentId);
        const role = department.roles.find((role) => role._id.equals(user.roleId));

        // Log the department name and role name
        console.log('Department Name:', department.departmentName);
        console.log('Role Name:', role.roleName);

        // Check if the user is a CRE by verifying role and department
        if (!role || department.departmentName !== 'CRE') {
            return res.status(403).json({ message: 'User is not authorized as CRE' });
        }

        // 1. Count new assigned leads with unseen messages
        const newAssignedCount = await Lead.countDocuments({
            creName: creId,
            messagesSeen: false,
        });

        // 2. Count pending reminders using aggregation
        const reminderPendingCount = await Lead.aggregate([
            { $match: { creName: creId } },
            { $unwind: '$reminder' },
            { $match: { 'reminder.status': 'Pending' } },
            { $count: 'count' },
        ]).then((result) => result[0]?.count || 0);

        // 3. Count missed reminders using aggregation
        const missedReminderCount = await Lead.aggregate([
            { $match: { creName: creId } },
            { $unwind: '$reminder' },
            { $match: { 'reminder.status': 'Missed' } },
            { $count: 'count' },
        ]).then((result) => result[0]?.count || 0);

        const notifications = [
            { label: 'New Messages', count: newAssignedCount },
            { label: 'Pending Reminders', count: reminderPendingCount },
            { label: 'Missed Reminders', count: missedReminderCount },
        ];

        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    getNotifications,
    getMeetingsData,
    getAllCREsPerformanceData,
    getCREPerformanceDataById,
};
