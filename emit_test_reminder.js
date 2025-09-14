// This script will be run in the context of the running server
// Add this to your server.js or app.js temporarily to test socket emission

const testEmitReminder = () => {
    const { getIO } = require('./src/socket/socketService');
    
    try {
        const io = getIO();
        console.log('\n=== MANUAL SOCKET TEST ===');
        console.log('Emitting test upcomingReminder event...');
        
        // Emit a test upcomingReminder event
        io.emit('upcomingReminder', {
            leadId: 'test-lead-id-manual',
            reminderId: 'test-reminder-id-manual',
            leadName: 'Manual Test Lead',
            timeRemaining: 3 // 3 minutes
        });
        
        console.log('✅ Manual test upcomingReminder event emitted!');
        console.log('📱 Check your browser console for the notification');
        
        // Also emit a simple test event
        io.emit('test', { message: 'Manual test from running server!' });
        console.log('✅ Manual test event emitted!');
        
    } catch (error) {
        console.error('❌ Error in manual test:', error);
    }
};

// Export the function so it can be called from the server
module.exports = { testEmitReminder };

// If run directly, execute the test
if (require.main === module) {
    console.log('This script should be imported and called from the running server.');
    console.log('Add this to your server: const { testEmitReminder } = require("./emit_test_reminder"); testEmitReminder();');
}