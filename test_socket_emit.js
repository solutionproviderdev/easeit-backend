const { getIO } = require('./src/socket/socketService');
const mongoose = require('mongoose');

const testSocketEmit = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easeit');
        
        console.log('Testing socket emission...');
        
        // Get the socket instance
        const io = getIO();
        
        // Emit a test upcomingReminder event
        const testData = {
            leadId: '68b57ed3d2d65ccbaf1ee4c5',
            reminderId: 'test-reminder-id',
            reminder: {
                time: new Date(),
                status: 'Pending'
            },
            leadName: 'Test Lead',
            timeRemaining: 5
        };
        
        console.log('Emitting upcomingReminder event with data:', testData);
        io.emit('upcomingReminder', testData);
        
        console.log('Socket event emitted successfully');
        console.log('Check your frontend console and browser for the notification');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testSocketEmit();