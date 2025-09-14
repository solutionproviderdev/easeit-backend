const mongoose = require('mongoose');
const Lead = require('./src/schemas/LeadsSchema');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/easeit', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const createTestReminder = async () => {
    try {
        // Get current time and add exactly 10 minutes
        const now = new Date();
        const reminderTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
        
        console.log(`Current time: ${now.toISOString()}`);
        console.log(`Reminder time: ${reminderTime.toISOString()}`);
        console.log(`Time difference: 10 minutes`);
        
        // Find any lead to add the reminder to
        const lead = await Lead.findOne({});
        
        if (!lead) {
            console.log('No leads found in database');
            return;
        }
        
        console.log(`Adding reminder to lead: ${lead._id} (${lead.name || 'Unknown'})`);
        
        // Add the test reminder
        const newReminder = {
            time: reminderTime,
            status: 'Pending',
            tenMinNotificationSent: false
        };
        
        lead.reminder.push(newReminder);
        await lead.save();
        
        console.log('✅ Test reminder created successfully!');
        console.log('🔔 The cron job should trigger a notification within the next minute');
        console.log('📱 Check your browser for the toast notification');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error creating test reminder:', error);
        process.exit(1);
    }
};

createTestReminder();