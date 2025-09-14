const mongoose = require('mongoose');
const Lead = require('./src/schemas/LeadsSchema');

const debugReminder = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easeit');
        
        console.log('=== DEBUGGING REMINDER SYSTEM ===');
        
        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
        
        console.log('Current time:', now.toISOString());
        console.log('Ten minutes later:', tenMinutesLater.toISOString());
        
        // Find the specific lead we created the test reminder for
        const testLead = await Lead.findById('68b57ed3d2d65ccbaf1ee4c5');
        
        if (testLead) {
            console.log('\n=== TEST LEAD FOUND ===');
            console.log('Lead ID:', testLead._id);
            console.log('Lead Name:', testLead.name);
            console.log('Total reminders:', testLead.reminder ? testLead.reminder.length : 0);
            
            if (testLead.reminder && testLead.reminder.length > 0) {
                console.log('\n=== REMINDERS DETAILS ===');
                testLead.reminder.forEach((reminder, index) => {
                    console.log(`Reminder ${index + 1}:`);
                    console.log('  - ID:', reminder._id);
                    console.log('  - Time:', reminder.time.toISOString());
                    console.log('  - Status:', reminder.status);
                    console.log('  - tenMinNotificationSent:', reminder.tenMinNotificationSent);
                    console.log('  - Is within 10 min window?', reminder.time > now && reminder.time <= tenMinutesLater);
                    console.log('  - Is pending?', reminder.status === 'Pending');
                    console.log('  - Notification not sent?', !reminder.tenMinNotificationSent);
                    console.log('  - Should trigger?', 
                        reminder.status === 'Pending' && 
                        reminder.time > now && 
                        reminder.time <= tenMinutesLater &&
                        !reminder.tenMinNotificationSent
                    );
                    console.log('');
                });
            }
        } else {
            console.log('Test lead not found!');
        }
        
        // Now run the same query as the checkUpcomingReminders function
        console.log('\n=== RUNNING SAME QUERY AS CRON JOB ===');
        const leads = await Lead.find({
            reminder: {
                $elemMatch: {
                    time: { $gt: now, $lte: tenMinutesLater },
                    status: 'Pending',
                    tenMinNotificationSent: { $ne: true }
                },
            },
        });
        
        console.log('Query result - Found leads:', leads.length);
        
        leads.forEach((lead, index) => {
            console.log(`\nLead ${index + 1}:`);
            console.log('  - ID:', lead._id);
            console.log('  - Name:', lead.name);
            
            const upcomingReminders = lead.reminder.filter(
                (reminder) => 
                    reminder.status === 'Pending' && 
                    reminder.time > now && 
                    reminder.time <= tenMinutesLater &&
                    !reminder.tenMinNotificationSent
            );
            
            console.log('  - Upcoming reminders:', upcomingReminders.length);
            upcomingReminders.forEach((reminder, rIndex) => {
                const timeRemaining = Math.round((reminder.time - now) / (60 * 1000));
                console.log(`    Reminder ${rIndex + 1}: ${timeRemaining} minutes remaining`);
            });
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugReminder();