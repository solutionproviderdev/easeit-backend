const momenttz = require('moment-timezone');

const formatDateRange = (startDate, endDate) => {
    const start = momenttz.tz(startDate, 'Asia/Dhaka').startOf('day').toDate();
    const end = momenttz.tz(endDate, 'Asia/Dhaka').endOf('day').toDate();

    return { start, end };
};

const formatThreshold = (messageReplyTimeMin) => {
    // Get the current time in Asia/Dhaka timezone and subtract the given minutes.
    const threshold = momenttz.tz('Asia/Dhaka').subtract(messageReplyTimeMin, 'minutes').toDate();
    return threshold;
};

const rightNow = () => momenttz.tz('Asia/Dhaka').toDate();

module.exports = { formatDateRange, formatThreshold, rightNow };
