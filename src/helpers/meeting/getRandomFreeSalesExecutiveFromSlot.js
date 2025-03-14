const Department = require('../../schemas/auth/DepartmentSchema');
const User = require('../../schemas/auth/UserSchema');
const Meeting = require('../../schemas/MeetingSchema');

/**
 * Get a random free sales executive for a given date and slot.
 * A sales executive is considered free if they do not have a meeting at the specified slot.
 *
 * @param {Date|string} date - The date (e.g., "2025-03-14" or a Date object).
 * @param {string} slot - The timeslot (e.g., "10:00 AM").
 * @returns {Promise<string|null>} - The _id of a free sales executive, or null if none are free.
 */
async function getRandomFreeSalesExecutiveFromSlot(date, slot) {
    try {
        // 1. Get the Sales department
        const salesDepartment = await Department.findOne({
            departmentName: 'Sales',
        });
        if (!salesDepartment) {
            console.error('Sales department not found.');
            return null;
        }

        // 2. Get the Sales role from the department
        const salesRole = salesDepartment.roles.find((role) => role.roleName === 'Sales');
        if (!salesRole) {
            console.error('Sales role not found in department.');
            return null;
        }

        // 3. Get all active sales executives based on the Sales role
        const salesExecs = await User.find({
            roleId: salesRole._id.toString(),
        }).select('_id');
        if (salesExecs.length === 0) {
            console.log('No sales executives found.');
            return null;
        }

        // 4. Find all "Fixed" meetings on the given date and slot
        //  that are not canceled or postponed
        const meetings = await Meeting.find({
            date,
            slot,
            status: { $nin: ['Canceled', 'Postponed'] },
        }).select('salesExecutive');

        // 5. Gather the sales executive IDs who have a meeting at that slot
        const busyExecIds = new Set(meetings.map((m) => m.salesExecutive.toString()));

        // 6. Filter out busy sales executives to get the free ones
        const freeExecs = salesExecs.filter((exec) => !busyExecIds.has(exec._id.toString()));

        if (freeExecs.length === 0) {
            console.log('No free sales executives for that slot.');
            return null;
        }

        // 7. Pick a random free executive and return its ID as a string
        const randomIndex = Math.floor(Math.random() * freeExecs.length);
        console.log('Random free sales executive:', freeExecs[randomIndex]._id.toString());
        return freeExecs[randomIndex]._id.toString();
    } catch (error) {
        console.error('Error getting random free sales executive:', error);
        return null;
    }
}

module.exports = { getRandomFreeSalesExecutiveFromSlot };
