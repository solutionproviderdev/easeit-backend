const momenttz = require('moment-timezone');

const formatDateRange = (startDate, endDate) => {
    const start = momenttz.tz(startDate, 'Asia/Dhaka').startOf('day').toDate();
    const end = momenttz.tz(endDate, 'Asia/Dhaka').endOf('day').toDate();
    // console.log(`Formatted Date Range: ${start} to ${end}`);
    return { start, end };
};

module.exports = { formatDateRange };
