const mongoose = require('mongoose');
const Lead = require('./src/schemas/LeadsSchema');

const createTestReminder = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easeit');
        
        // Find any lead to add a test reminder to
        const lead = await Lead.findOne({});
        
        if (!lead) {
            console.log('No leads found in database');
            process.exit(1);
        }
        
        console.log('Found lead:', lead.name, 'ID:', lead._id);
        
        // Create a reminder for 5 minutes from now
        const reminderTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        
        const newReminder = {
            time: reminderTime,
            status: 'Pending',
            tenMinNotificationSent: false
        };
        
        lead.reminder.push(newReminder);
        await lead.save();
        
        console.log('Created test reminder for:', reminderTime.toISOString());
        console.log('This should trigger a notification in about 5 minutes');
        console.log('Current time:', new Date().toISOString());
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createTestReminder();