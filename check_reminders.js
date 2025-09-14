const mongoose = require('mongoose');
const Lead = require('./src/schemas/LeadsSchema');

const checkReminders = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easeit');
        
        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
        
        console.log('Current time:', now.toISOString());
        console.log('Ten minutes later:', tenMinutesLater.toISOString());
        
        const leads = await Lead.find({
            reminder: {
                $elemMatch: {
                    time: { $gt: now, $lte: tenMinutesLater },
                    status: 'Pending',
                    tenMinNotificationSent: { $ne: true }
                }
            }
        });
        
        console.log('Found leads with upcoming reminders:', leads.length);
        
        leads.forEach(lead => {
            const upcomingReminders = lead.reminder.filter(r => 
                r.status === 'Pending' && 
                r.time > now && 
                r.time <= tenMinutesLater &&
                !r.tenMinNotificationSent
            );
            
            console.log('Lead:', lead.name, 'ID:', lead._id, 'Upcoming reminders:', upcomingReminders.length);
            upcomingReminders.forEach(r => {
                const minutesRemaining = Math.round((r.time - now) / 60000);
                console.log('  - Reminder time:', r.time.toISOString(), 'Minutes remaining:', minutesRemaining);
            });
        });
        
        // Also check for any pending reminders in general
        const allPendingReminders = await Lead.find({
            reminder: {
                $elemMatch: {
                    status: 'Pending'
                }
            }
        });
        
        console.log('\nTotal leads with pending reminders:', allPendingReminders.length);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkReminders();