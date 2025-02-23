const TimeSlots = require('../../schemas/TimeSlots');

// Helper function to sort the time slots chronologically
const sortTimeSlotsChronologically = (slots) => {
    const timeOrder = [
        '12:00 AM',
        '1:00 AM',
        '2:00 AM',
        '3:00 AM',
        '4:00 AM',
        '5:00 AM',
        '6:00 AM',
        '7:00 AM',
        '8:00 AM',
        '9:00 AM',
        '10:00 AM',
        '11:00 AM',
        '12:00 PM',
        '1:00 PM',
        '2:00 PM',
        '3:00 PM',
        '4:00 PM',
        '5:00 PM',
        '6:00 PM',
        '7:00 PM',
        '8:00 PM',
        '9:00 PM',
        '10:00 PM',
        '11:00 PM',
    ];
    return slots.sort((a, b) => timeOrder.indexOf(a.slot) - timeOrder.indexOf(b.slot));
};

// Get all active time slots
exports.getAllActiveSlots = async (req, res) => {
    try {
        console.log('Fetching active time slots...');
        const activeSlots = await TimeSlots.find({ active: true });
        res.status(200).json(activeSlots);
    } catch (error) {
        console.error('Error fetching active time slots:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Add a new time slot to the right
exports.addTimeSlotToRight = async (req, res) => {
    try {
        // Find all time slots and sort them chronologically
        const allSlots = await TimeSlots.find();
        const sortedSlots = sortTimeSlotsChronologically(allSlots);

        // Find the index of the last active slot
        const lastActiveIndex = sortedSlots.map((slot) => slot.active).lastIndexOf(true);

        // Check if there is an inactive slot after the last active one
        if (lastActiveIndex + 1 < sortedSlots.length) {
            // Activate the next inactive slot to the right
            sortedSlots[lastActiveIndex + 1].active = true;
            await sortedSlots[lastActiveIndex + 1].save();

            res.status(200).json({
                message: `Activated slot ${sortedSlots[lastActiveIndex + 1].slot}`,
                slot: sortedSlots[lastActiveIndex + 1],
            });
        } else {
            res.status(400).json({ message: 'No more slots available to activate on the right.' });
        }
    } catch (error) {
        console.error('Error adding new time slot:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Add a new time slot to the left
exports.addTimeSlotToLeft = async (req, res) => {
    try {
        // Find all time slots and sort them chronologically
        const allSlots = await TimeSlots.find();
        const sortedSlots = sortTimeSlotsChronologically(allSlots);

        // Find the index of the first active slot
        const firstActiveIndex = sortedSlots.findIndex((slot) => slot.active === true);

        // Check if there is an inactive slot before the first active one
        if (firstActiveIndex > 0) {
            // Activate the previous inactive slot to the left
            sortedSlots[firstActiveIndex - 1].active = true;
            await sortedSlots[firstActiveIndex - 1].save();

            res.status(200).json({
                message: `Activated slot ${sortedSlots[firstActiveIndex - 1].slot}`,
                slot: sortedSlots[firstActiveIndex - 1],
            });
        } else {
            res.status(400).json({ message: 'No more slots available to activate on the left.' });
        }
    } catch (error) {
        console.error('Error adding new time slot:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Deactivate (Delete) a time slot from the right
exports.deleteTimeSlotFromRight = async (req, res) => {
    try {
        // Find all time slots and sort them chronologically
        const allSlots = await TimeSlots.find();
        const sortedSlots = sortTimeSlotsChronologically(allSlots);

        // Find the index of the last active slot
        const lastActiveIndex = sortedSlots.map((slot) => slot.active).lastIndexOf(true);

        // Check if there is an active slot to the right to deactivate
        if (lastActiveIndex >= 0) {
            // Deactivate the last active slot
            sortedSlots[lastActiveIndex].active = false;
            await sortedSlots[lastActiveIndex].save();

            res.status(200).json({
                message: `Deactivated slot ${sortedSlots[lastActiveIndex].slot}`,
                slot: sortedSlots[lastActiveIndex],
            });
        } else {
            res.status(400).json({
                message: 'No more active slots available to deactivate on the right.',
            });
        }
    } catch (error) {
        console.error('Error deactivating time slot from the right:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Deactivate (Delete) a time slot from the left
exports.deleteTimeSlotFromLeft = async (req, res) => {
    try {
        // Find all time slots and sort them chronologically
        const allSlots = await TimeSlots.find();
        const sortedSlots = sortTimeSlotsChronologically(allSlots);

        // Find the index of the first active slot
        const firstActiveIndex = sortedSlots.findIndex((slot) => slot.active === true);

        // Check if there is an active slot to the left to deactivate
        if (firstActiveIndex > 0) {
            // Deactivate the first active slot to the left
            sortedSlots[firstActiveIndex - 1].active = false;
            await sortedSlots[firstActiveIndex - 1].save();

            res.status(200).json({
                message: `Deactivated slot ${sortedSlots[firstActiveIndex - 1].slot}`,
                slot: sortedSlots[firstActiveIndex - 1],
            });
        } else {
            res.status(400).json({
                message: 'No more active slots available to deactivate on the left.',
            });
        }
    } catch (error) {
        console.error('Error deactivating time slot from the left:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Create default time slots collection
exports.createDefaultTimeSlots = async () => {
    try {
        // Fetch all time slots
        const existingTimeSlots = await TimeSlots.find();

        // Define default time slots with active status based on time
        const defaultTimeSlots = [
            { slot: '10:00 AM', active: true },
            { slot: '11:00 AM', active: true },
            { slot: '12:00 PM', active: true },
            { slot: '01:00 PM', active: true },
            { slot: '02:00 PM', active: true },
            { slot: '03:00 PM', active: true },
            { slot: '04:00 PM', active: true },
            { slot: '05:00 PM', active: true },
            { slot: '06:00 PM', active: true },
            { slot: '07:00 PM', active: false },
            { slot: '08:00 PM', active: false },
            { slot: '09:00 PM', active: false },
            { slot: '10:00 PM', active: false },
            { slot: '11:00 PM', active: false },
            { slot: '12:00 AM', active: false },
            { slot: '01:00 AM', active: false },
            { slot: '02:00 AM', active: false },
            { slot: '03:00 AM', active: false },
            { slot: '04:00 AM', active: false },
            { slot: '05:00 AM', active: false },
            { slot: '06:00 AM', active: false },
            { slot: '07:00 AM', active: false },
            { slot: '08:00 AM', active: false },
            { slot: '09:00 AM', active: false },
        ];

        // Add default time slots if not already present
        const newTimeSlots = defaultTimeSlots
            .filter(
                (slot) => !existingTimeSlots.some((existingSlot) => existingSlot.slot === slot.slot)
            )
            .map((slot) => ({ slot: slot.slot, active: slot.active }));

        // Save new time slots
        if (newTimeSlots.length > 0) {
            await TimeSlots.insertMany(newTimeSlots);
            console.log('Default time slots created');
        } else {
            console.log('Default time slots already exist');
        }
    } catch (error) {
        console.error('Error creating default time slots:', error);
    }
};
