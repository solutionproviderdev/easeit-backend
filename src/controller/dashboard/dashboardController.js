/* eslint-disable no-shadow */
const moment = require('moment');
const User = require('../../schemas/auth/UserSchema');
const Meeting = require('../../schemas/MeetingSchema');
const Lead = require('../../schemas/LeadsSchema');
const Department = require('../../schemas/auth/DepartmentSchema');

const getAllCREsPerformanceData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

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
        // Normalize start and end times to cover the entire day
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

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

        // Fetch total number of leads within the date range
        const totalLeads = await Lead.countDocuments({
            createdAt: { $gte: start, $lte: end },
        });

        // Iterate over each CRE user and calculate their performance data within the date range
        const crePerformanceData = await Promise.all(
            creUsers.map(async (user) => {
                const assigned = await Lead.countDocuments({
                    creName: user._id,
                    createdAt: { $gte: start, $lte: end },
                });

                const numberCollected = await Lead.countDocuments({
                    creName: user._id,
                    phone: { $exists: true, $ne: [] },
                    createdAt: { $gte: start, $lte: end },
                });

                const leadsForUser = await Lead.find({
                    creName: user._id,
                    createdAt: { $gte: start, $lte: end },
                }).select('_id');
                const leadIds = leadsForUser.map((lead) => lead._id);

                const meetingsSet = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    date: { $gte: start, $lte: end },
                });

                const meetingsCompleted = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: { $in: ['Complete', 'Sold'] },
                    date: { $gte: start, $lte: end },
                });

                // Calculate separate counts for rescheduled and postponed meetings
                const meetingRscheduled = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Rescheduled',
                    date: { $gte: start, $lte: end },
                });

                const meetingPostponed = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Postponed',
                    date: { $gte: start, $lte: end },
                });

                const totalSales = await Meeting.countDocuments({
                    lead: { $in: leadIds },
                    status: 'Sold',
                    date: { $gte: start, $lte: end },
                });

                const target = 100;

                // Calculate individual percentages
                const LAR = totalLeads > 0 ? (assigned / totalLeads) * 100 : 0;
                const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
                const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
                const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
                const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
                const MRR = meetingsSet > 0 ? (meetingRscheduled / meetingsSet) * 100 : 0;
                const MPR = meetingsSet > 0 ? (meetingPostponed / meetingsSet) * 100 : 0;

                // Calculate complete performance using the new formula:
                // Complete Performance = (LAR + NCR + MSR + MCR + TA)/5 - (MRR + MPR)/2
                const positiveAverage = (LAR + NCR + MSR + MCR + TA) / 5;
                const penalty = (MRR + MPR) / 2;
                const completePerformance = positiveAverage - penalty;

                // Prepare bar chart data with the new complete performance calculation
                const barChartData = [
                    {
                        label: 'Lead Assign Rate',
                        value: LAR,
                    },
                    {
                        label: 'Number Collection Rate',
                        value: NCR,
                    },
                    {
                        label: 'Meeting Set Rate',
                        value: MSR,
                    },
                    {
                        label: 'Meeting Reschedule Rate',
                        value: MRR,
                    },
                    {
                        label: 'Meeting Postpone Rate',
                        value: MPR,
                    },
                    {
                        label: 'Meeting Complete Rate',
                        value: MCR,
                    },
                    {
                        label: 'Target Achieved',
                        value: TA,
                    },
                    {
                        label: 'Complete Performance',
                        value: completePerformance,
                    },
                ];

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
                        meetingRscheduled,
                        meetingPostponed,
                        totalSales,
                        completePerformance,
                        target: target - meetingsCompleted, // remaining target
                    },
                    barChartData,
                };
            })
        );

        res.status(200).json(crePerformanceData);
        // Emit data to all connected clients using Socket.IO
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
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        // Normalize times to cover the entire days
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

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

        // Fetch total number of leads within the date range
        const totalLeads = await Lead.countDocuments({
            createdAt: { $gte: start, $lte: end },
        });

        // Calculate performance metrics for this CRE using date filtering
        const assigned = await Lead.countDocuments({
            creName: user._id,
            createdAt: { $gte: start, $lte: end },
        });

        const numberCollected = await Lead.countDocuments({
            creName: user._id,
            phone: { $exists: true, $ne: [] },
            createdAt: { $gte: start, $lte: end },
        });

        const leadsForUser = await Lead.find({
            creName: user._id,
            createdAt: { $gte: start, $lte: end },
        }).select('_id');
        const leadIds = leadsForUser.map((lead) => lead._id);

        const meetingsSet = await Meeting.countDocuments({
            lead: { $in: leadIds },
            date: { $gte: start, $lte: end },
        });

        const meetingsCompleted = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: { $in: ['Complete', 'Sold'] },
            date: { $gte: start, $lte: end },
        });

        // Calculate separate counts for rescheduled and postponed meetings
        const meetingRscheduled = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Rescheduled',
            date: { $gte: start, $lte: end },
        });

        const meetingPostponed = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Postponed',
            date: { $gte: start, $lte: end },
        });

        const totalSales = await Meeting.countDocuments({
            lead: { $in: leadIds },
            status: 'Sold',
            date: { $gte: start, $lte: end },
        });

        const target = 100;

        // Calculate individual percentages (if denominators are > 0; else default to 0)
        const LAR = totalLeads > 0 ? (assigned / totalLeads) * 100 : 0;
        const NCR = assigned > 0 ? (numberCollected / assigned) * 100 : 0;
        const MSR = numberCollected > 0 ? (meetingsSet / numberCollected) * 100 : 0;
        const MCR = meetingsSet > 0 ? (meetingsCompleted / meetingsSet) * 100 : 0;
        const TA = target > 0 ? (meetingsCompleted / target) * 100 : 0;
        const MRR = meetingsSet > 0 ? (meetingRscheduled / meetingsSet) * 100 : 0;
        const MPR = meetingsSet > 0 ? (meetingPostponed / meetingsSet) * 100 : 0;

        // Calculate complete performance using the new formula:
        // Complete Performance = (LAR + NCR + MSR + MCR + TA) / 5 - (MRR + MPR) / 2
        const positiveAverage = (LAR + NCR + MSR + MCR + TA) / 5;
        const penalty = (MRR + MPR) / 2;
        const completePerformance = positiveAverage - penalty;

        // Prepare bar chart data with the new performance percentages
        const barChartData = [
            { label: 'Lead Assign Rate', value: LAR },
            { label: 'Number Collection Rate', value: NCR },
            { label: 'Meeting Set Rate', value: MSR },
            { label: 'Meeting Reschedule Rate', value: MRR },
            { label: 'Meeting Postpone Rate', value: MPR },
            { label: 'Meeting Complete Rate', value: MCR },
            { label: 'Target Achieved', value: TA },
            { label: 'Complete Performance', value: completePerformance },
        ];

        // Structure the response data similar to getAllCREsPerformanceData
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
                meetingRscheduled,
                meetingPostponed,
                totalSales,
                completePerformance,
                target: target - meetingsCompleted, // remaining target
            },
            barChartData,
        };

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
            const dayLabel =                timeLength === 'week'
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

const getDateWiseLeadData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

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
        const leads = await Lead.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $project: {
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                            timezone: 'UTC',
                        },
                    },
                    hasPhone: { $gt: [{ $size: { $ifNull: ['$phone', []] } }, 0] },
                    isMeetingFixed: { $eq: ['$status', 'Meeting Fixed'] },
                },
            },
        ]);

        // Aggregate data from the Meetings collection
        const meetings = await Meeting.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                },
            },
            {
                $project: {
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$date',
                            timezone: 'UTC',
                        },
                    },
                    isMeetingCompleted: { $eq: ['$status', 'Complete'] },
                    isMeetingSold: { $eq: ['$status', 'Sold'] },
                },
            },
        ]);

        // Populate grouped data for leads
        leads.forEach((lead) => {
            if (groupedData[lead.date]) {
                groupedData[lead.date].leads += 1;
                if (lead.hasPhone) groupedData[lead.date].numberCollected += 1;
                if (lead.isMeetingFixed) groupedData[lead.date].meetingsFixed += 1;
            }
        });

        // Populate grouped data for meetings
        meetings.forEach((meeting) => {
            if (groupedData[meeting.date]) {
                if (meeting.isMeetingCompleted) groupedData[meeting.date].meetingsCompleted += 1;
                if (meeting.isMeetingSold) groupedData[meeting.date].meetingsSold += 1;
            }
        });

        // Prepare the response in an array format
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
