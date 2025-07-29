const moment = require('moment');
const Meeting = require('../schemas/MeetingSchema');

const getDateAndWeekdayWiseMeetingBarchartData = async (dateRande = '01-02-2025_31-07-2025') => {
    try {
        // get all the meeting
        const meetings = await Meeting.find({
            date: {
                $gte: new Date(dateRande.split('_')[0]),
                $lte: new Date(dateRande.split('_')[1]),
            },
        });

        // Initialize data structure for bar chart
        const weekdayData = {
            Sunday: 0,
            Monday: 0,
            Tuesday: 0,
            Wednesday: 0,
            Thursday: 0,
            Friday: 0,
            Saturday: 0,
        };

        // Initialize data structure for date-wise data
        const dateWiseData = {};

        // Process each meeting
        meetings.forEach((meeting) => {
            const meetingDate = moment(meeting.date);
            const formattedDate = meetingDate.format('YYYY-MM-DD');
            const weekday = meetingDate.format('dddd');

            // Increment weekday count
            weekdayData[weekday]++;

            // Add to date-wise data
            if (!dateWiseData[formattedDate]) {
                dateWiseData[formattedDate] = 0;
            }
            dateWiseData[formattedDate]++;
        });

        // Convert dateWiseData to array format for charts
        const dateWiseArray = Object.keys(dateWiseData)
            .map((date) => ({
                date,
                count: dateWiseData[date],
            }))
            .sort((a, b) => moment(a.date).diff(moment(b.date)));

        // Convert weekdayData to array format for charts
        const weekdayArray = Object.keys(weekdayData).map((day) => ({
            day,
            count: weekdayData[day],
        }));

        return {
            dateWise: dateWiseArray,
            weekdayWise: weekdayArray,
            totalMeetings: meetings.length,
        };
    } catch (error) {
        console.error('Error in getDateAndWeekdayWiseMeetingBarchartData:', error);
        return {
            dateWise: [],
            weekdayWise: [],
            totalMeetings: 0,
            error: error.message,
        };
    }
};

module.exports = {
    getDateAndWeekdayWiseMeetingBarchartData,
};
