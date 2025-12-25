const mongoose = require('mongoose');
const Lead = require('../src/schemas/LeadsSchema');

const createFreshReminder = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easeit');
        
        console.log('Creating a fresh test reminder...');
        
        // Find the test lead
        const lead = await Lead.findById('68b57ed3d2d65ccbaf1ee4c5');
        
        if (!lead) {
            console.log('Lead not found!');
            process.exit(1);
        }
        
        // Create a new reminder 8 minutes from now (within the 10-minute window)
        const reminderTime = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes from now
        
        const newReminder = {
            time: reminderTime,
            status: 'Pending',
            tenMinNotificationSent: false // Explicitly set to false
        };
        
        // Add the reminder to the lead
        lead.reminder.push(newReminder);
        
        // Save the lead
        await lead.save();
        
        console.log('Fresh reminder created successfully!');
        console.log('Lead ID:', lead._id);
        console.log('Reminder time:', reminderTime.toISOString());
        console.log('Current time:', new Date().toISOString());
        console.log('Minutes until reminder:', Math.round((reminderTime - new Date()) / (60 * 1000)));
        console.log('\nThis reminder should trigger within the next few minutes.');
        console.log('Check your frontend for the notification!');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createFreshReminder();