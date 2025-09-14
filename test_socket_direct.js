const { getIO } = require('./src/socket/socketService');

// Wait a moment for the server to be ready, then emit a test event
setTimeout(() => {
    try {
        const io = getIO();
        console.log('\n=== SOCKET TEST ===');
        console.log('Emitting test upcomingReminder event...');
        
        // Emit a test upcomingReminder event
        io.emit('upcomingReminder', {
            leadId: 'test-lead-id',
            reminderId: 'test-reminder-id',
            leadName: 'Test Lead Name',
            timeRemaining: 5 // 5 minutes
        });
        
        console.log('✅ Test upcomingReminder event emitted successfully!');
        console.log('📱 Check your browser console and look for the toast notification');
        console.log('🔊 You should also hear a notification sound');
        
        // Also emit a simple test event
        io.emit('test', { message: 'Hello from backend!' });
        console.log('✅ Test event emitted successfully!');
        
    } catch (error) {
        console.error('❌ Error emitting test events:', error);
    }
}, 2000); // Wait 2 seconds

console.log('Socket test script started. Waiting 2 seconds before emitting events...');