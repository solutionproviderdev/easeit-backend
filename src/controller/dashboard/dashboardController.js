/* eslint-disable no-shadow */
const moment = require('moment');
const momenttz = require('moment-timezone');
const User = require('../../schemas/auth/UserSchema');
const Meeting = require('../../schemas/MeetingSchema');
const Lead = require('../../schemas/LeadsSchema');
const Department = require('../../schemas/auth/DepartmentSchema');
const getCREPerformance = require('../../helpers/getCREPerformance');
const { formatDateRange } = require('../../helpers/firmatDateRange');

const getAllCREsPerformanceData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validate input dates
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        // Validate date format
        const tempStart = new Date(startDate);
        const tempEnd = new Date(endDate);
        if (isNaN(tempStart.getTime()) || isNaN(tempEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Format date range using the helper function
        const { start, end } = formatDateRange(startDate, endDate);

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
            status: 'Active',
        });
        if (creUsers.length === 0) {
            return res.status(404).json({ message: 'No CRE users found' });
        }

        // Iterate over each CRE user and calculate their performance data within the date range
        const crePerformanceData = await Promise.all(
            creUsers.map(async (user) => {
                const performances = await getCREPerformance(user._id, start, end);

                const { LAR, NCR, MSR, MCR, TA, MRR, MPR, MCeR, SR } =
                    performances.performanceRates || {};

                const {
                    assigned,
                    numberCollected,
                    meetingsSet,
                    meetingsCompleted,
                    meetingsRescheduled,
                    meetingPostponed,
                    meetingCancelled,
                    totalSales,
                    completePerformance,
                    followUpPerformance,
                    target,
                } = performances.performanceMetrics;

                // Prepare bar chart data with new metrics
                const barChartData = [
                    { label: 'Lead Assign Rate', value: LAR },
                    { label: 'Number Collection Rate', value: NCR },
                    { label: 'Meeting Set Rate', value: MSR },
                    { label: 'Meeting Reschedule Rate', value: MRR },
                    { label: 'Meeting Postpone Rate', value: MPR },
                    { label: 'Meeting Canceled Rate', value: MCeR },
                    { label: 'Meeting Complete Rate', value: MCR },
                    { label: 'Target Achieved', value: TA },
                    { label: 'Sold Rate', value: SR },
                    { label: 'Complete Performance', value: completePerformance },
                    { label: 'FollowUp Perfomance', value: followUpPerformance },
                ];

                return {
                    id: user._id.toString(),
                    name: user.nameAsPerNID,
                    role: {
                        roleName: creRole.roleName,
                        departmentName: department.departmentName,
                    },
                    profilePictureUrl: user.profilePicture || null,
                    performanceMessages: performances.performanceMessages,
                    performanceMetrics: {
                        assigned,
                        numberCollected,
                        meetingsSet,
                        meetingsCompleted,
                        meetingRscheduled: meetingsRescheduled,
                        meetingPostponed,
                        meetingCancelled,
                        totalSales,
                        completePerformance,
                        followUpPerformance,
                        target, // remaining target
                    },
                    barChartData,
                };
            })
        );

        // sort crePerformanceData by completePerformance in descending order
        crePerformanceData.sort(
            // eslint-disable-next-line max-len
            (a, b) => b.performanceMetrics.completePerformance - a.performanceMetrics.completePerformance
        );

        res.status(200).json(crePerformanceData);
        req.io.emit('crePerformanceUpdated', crePerformanceData);
    } catch (error) {
        console.error('Error fetching CRE performance data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Controller function to get performance data for a specific CRE by ID
const getCREPerformanceDataById = async (req, res) => {
    try {
        const { creId } = req.params;
        const { startDate, endDate } = req.query;

        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        // Parse and normalize start and end dates
        let start = new Date(startDate);
        let end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        // Normalize times to cover the entire days
        start = momenttz.tz(start, 'Asia/Dhaka').startOf('day').utc();
        end = momenttz.tz(end, 'Asia/Dhaka').endOf('day').utc();

        // Find the CRE user by ID and populate its department info
        const user = await User.findById(creId).populate('departmentId');
        if (!user) {
            return res.status(404).json({ message: 'CRE not found' });
        }

        // Ensure the user's department and role match "CRE"
        const department = await Department.findById(user.departmentId._id);
        const role = department.roles.find(
            (r) => r._id.toString() === user.roleId.toString() && r.roleName === 'CRE'
        );
        if (!role) {
            return res.status(400).json({ message: 'User is not a CRE' });
        }

        const performances = await getCREPerformance(user._id, start, end);

        const { LAR, NCR, MSR, MCR, TA, MRR, MPR, MCeR, SR } = performances.performanceRates || {};

        const {
            assigned,
            numberCollected,
            meetingsSet,
            meetingsCompleted,
            meetingsRescheduled,
            meetingPostponed,
            meetingCancelled,
            totalSales,
            completePerformance,
            followUpPerformance,
            target,
        } = performances.performanceMetrics;

        const barChartData = [
            { label: 'Lead Assign Rate', value: LAR },
            { label: 'Number Collection Rate', value: NCR },
            { label: 'Meeting Set Rate', value: MSR },
            { label: 'Meeting Reschedule Rate', value: MRR },
            { label: 'Meeting Postpone Rate', value: MPR },
            { label: 'Meeting Canceled Rate', value: MCeR },
            { label: 'Meeting Complete Rate', value: MCR },
            { label: 'Target Achieved', value: TA },
            { label: 'Sold Rate', value: SR },
            { label: 'Complete Performance', value: completePerformance },
            { label: 'FollowUp Perfomance', value: followUpPerformance },
        ];

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
                meetingRscheduled: meetingsRescheduled,
                meetingPostponed,
                meetingCancelled,
                totalSales,
                soldRate: SR,
                completePerformance,
                followUpPerformance,
                target: target - meetingsCompleted,
            },
            barChartData,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching CRE performance data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
// data
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

// Get notifications
const getNotifications = async (req, res) => {
    try {
        const creId = req.user._id; // Get CRE ID from authenticated user

        // Fetch the user to verify the role and department
        const { user } = req;

        // Fetch the department and role details
        const department = await Department.findById(user.departmentId);
        const role = department.roles.find((role) => role._id.equals(user.roleId));

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

const getDateWiseLeadData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validate input dates
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        // Parse input dates as Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Normalize start and end times in Asia/Dhaka and convert to UTC for querying MongoDB.
        const startMomentUTC = moment.tz(start, 'Asia/Dhaka').startOf('day').utc();
        const endMomentUTC = moment.tz(end, 'Asia/Dhaka').endOf('day').utc();
        const startUTC = startMomentUTC.toDate();
        const endUTC = endMomentUTC.toDate();

        // console.log('Start Date & End Date', startUTC, endUTC);

        // Build days array by iterating over each local day in Asia/Dhaka,
        // then converting the start of that day to its UTC representation (including hour info).
        const daysArray = [];
        const currentLocal = moment.tz(start, 'Asia/Dhaka').startOf('day');
        const endLocal = moment.tz(end, 'Asia/Dhaka').startOf('day');

        while (currentLocal.isSameOrBefore(endLocal)) {
            // For example, local "2025-03-01T00:00:00+06:00" becomes "2025-02-28T18:00:00.000Z"
            daysArray.push(currentLocal.clone().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'));
            currentLocal.add(1, 'day');
        }

        // Initialize data structure using the UTC start-of-day strings as keys
        const groupedData = daysArray.reduce((acc, dateKey) => {
            acc[dateKey] = {
                date: dateKey,
                leads: 0,
                numberCollected: 0,
                meetingsFixed: 0,
                meetingsCompleted: 0,
                meetingsSold: 0,
            };
            return acc;
        }, {});

        // Aggregate leads data.
        // Note: We use timezone 'Asia/Dhaka' so that the
        // createdAt dates are converted to the local day.
        const leads = await Lead.aggregate([
            {
                $match: {
                    createdAt: { $gte: startUTC, $lte: endUTC },
                },
            },
            {
                $project: {
                    // Format the createdAt date into a local date string (YYYY-MM-DD)
                    localDate: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                            timezone: 'Asia/Dhaka',
                        },
                    },
                    hasPhone: { $gt: [{ $size: { $ifNull: ['$phone', []] } }, 0] },
                    isMeetingFixed: { $eq: ['$status', 'Meeting Fixed'] },
                },
            },
        ]);

        // Aggregate meetings data using the same timezone setting.
        const meetings = await Meeting.aggregate([
            {
                $match: {
                    date: { $gte: startUTC, $lte: endUTC },
                },
            },
            {
                $project: {
                    localDate: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$date',
                            timezone: 'Asia/Dhaka',
                        },
                    },
                    isMeetingCompleted: { $eq: ['$status', 'Complete'] },
                    isMeetingSold: { $eq: ['$status', 'Sold'] },
                },
            },
        ]);

        // Populate grouped data for leads.
        // Convert the local date string back into the UTC start-of-day key.
        leads.forEach((lead) => {
            const leadDateKey = moment
                .tz(lead.localDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                .startOf('day')
                .utc()
                .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
            if (groupedData[leadDateKey]) {
                groupedData[leadDateKey].leads += 1;
                if (lead.hasPhone) groupedData[leadDateKey].numberCollected += 1;
                if (lead.isMeetingFixed) groupedData[leadDateKey].meetingsFixed += 1;
            }
        });

        // Populate grouped data for meetings.
        meetings.forEach((meeting) => {
            const meetingDateKey = moment
                .tz(meeting.localDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                .startOf('day')
                .utc()
                .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
            if (groupedData[meetingDateKey]) {
                if (meeting.isMeetingCompleted) groupedData[meetingDateKey].meetingsCompleted += 1;
                if (meeting.isMeetingSold) groupedData[meetingDateKey].meetingsSold += 1;
            }
        });

        // Prepare the response as an array.
        const responseData = Object.values(groupedData);

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching date-wise lead data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getWeeklyLeadData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const creId = req.user._id;

        // Validate input dates
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        // Parse and normalize start and end dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Normalize start and end times to include entire day in UTC
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        // Initialize the date range
        const daysArray = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            daysArray.push(currentDate.toISOString().split('T')[0]); // Format: YYYY-MM-DD
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        // Initialize data structure for bar chart
        const groupedData = daysArray.reduce((acc, date) => {
            acc[date] = {
                date,
                leads: 0,
                numberCollected: 0,
                meetingsFixed: 0,
                meetingsCompleted: 0,
                meetingsSold: 0,
            };
            return acc;
        }, {});

        // Aggregate data from the Leads collection
    } catch (error) {
        console.error('Error fetching weekly lead data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
module.exports = {
    getNotifications,
    getMeetingsData,
    getDateWiseLeadData,
    getAllCREsPerformanceData,
    getCREPerformanceDataById,
};
