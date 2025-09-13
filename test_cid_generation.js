const mongoose = require('mongoose');
const Lead = require('./src/schemas/LeadsSchema');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/crm_test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function testCIDGeneration() {
    console.log('Testing CID Generation...');

    try {
        // Test 1: Create a new lead and verify CID is auto-generated
        console.log('\n1. Testing auto-generation of CID for new lead...');
        const testLead = new Lead({
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
            source: 'Facebook',
            status: 'New',
        });

        await testLead.save();
        console.log(`Generated CID: ${testLead.CID}`);

        // Verify CID format
        const cidPattern = /^FB-\d{2}[A-Z]{3}\d{2}-\d{3}$/;
        if (cidPattern.test(testLead.CID)) {
            console.log('✅ CID format is correct');
        } else {
            console.log('❌ CID format is incorrect');
        }

        // Test 2: Create another lead with same source to test sequence increment
        console.log('\n2. Testing sequence increment...');
        const testLead2 = new Lead({
            name: 'Test User 2',
            email: 'test2@example.com',
            phone: '1234567891',
            source: 'Facebook',
            status: 'New',
        });

        await testLead2.save();
        console.log(`Second lead CID: ${testLead2.CID}`);

        // Extract sequence numbers
        const seq1 = parseInt(testLead.CID.split('-')[2], 10);
        const seq2 = parseInt(testLead2.CID.split('-')[2], 10);

        if (seq2 === seq1 + 1) {
            console.log('✅ Sequence increment is working correctly');
        } else {
            console.log('❌ Sequence increment is not working');
        }

        // Test 3: Test different sources
        console.log('\n3. Testing different sources...');
        const sources = ['WhatsApp', 'Phone', 'Web'];
        const expectedPrefixes = ['WA', 'PH', 'WB'];

        const sourceTests = sources.map(async (source, i) => {
            const lead = new Lead({
                name: `Test User ${source}`,
                email: `test${i}@example.com`,
                phone: `123456789${i}`,
                source,
                status: 'New',
            });

            await lead.save();
            console.log(`${source} CID: ${lead.CID}`);

            if (lead.CID.startsWith(expectedPrefixes[i])) {
                console.log(`✅ ${source} prefix is correct`);
            } else {
                console.log(`❌ ${source} prefix is incorrect`);
            }
        });

        await Promise.all(sourceTests);

        // Test 4: Test lead with existing CID (should not overwrite)
        console.log('\n4. Testing lead with existing CID...');
        const leadWithCID = new Lead({
            name: 'Test User with CID',
            email: 'testwithcid@example.com',
            phone: '1234567899',
            source: 'Facebook',
            status: 'New',
            CID: 'CUSTOM-CID-001',
        });

        await leadWithCID.save();
        console.log(`Lead with existing CID: ${leadWithCID.CID}`);

        if (leadWithCID.CID === 'CUSTOM-CID-001') {
            console.log('✅ Existing CID is preserved');
        } else {
            console.log('❌ Existing CID was overwritten');
        }

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up test data
        await Lead.deleteMany({ email: { $regex: /test.*@example\.com/ } });
        await mongoose.connection.close();
    }
}

// Run the test
testCIDGeneration();