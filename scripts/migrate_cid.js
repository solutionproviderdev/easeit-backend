const mongoose = require('mongoose');
const Lead = require('../src/schemas/LeadsSchema');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/crm', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// CID Generation Function (copied from LeadsSchema)
async function generateCID(source, createdDate = new Date()) {
    // Map source to abbreviation
    const sourceMap = {
        Facebook: 'FB',
        WhatsApp: 'WA',
        Phone: 'PH',
        Web: 'WB',
    };

    const srcCode = sourceMap[source] || 'UN'; // UN for unknown

    // Get date in DDMMMYY format (use createdDate for existing leads)
    const day = String(createdDate.getDate()).padStart(2, '0');
    const months = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
    ];
    const month = months[createdDate.getMonth()];
    const year = String(createdDate.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;

    // Find the last lead with same source and date to get next sequence
    const cidPattern = new RegExp(`^${srcCode}-${dateStr}-(\\d{3})$`);

    const lastLead = await mongoose
        .model('Lead')
        .findOne({
            CID: cidPattern,
        })
        .sort({ CID: -1 })
        .exec();

    let sequence = 1;
    if (lastLead && lastLead.CID) {
        const match = lastLead.CID.match(cidPattern);
        if (match) {
            sequence = parseInt(match[1], 10) + 1;
        }
    }

    const sequenceStr = String(sequence).padStart(3, '0');
    return `${srcCode}-${dateStr}-${sequenceStr}`;
}

async function migrateCIDs() {
    console.log('Starting CID migration for existing leads...');

    try {
        // Find all leads without CID
        const leadsWithoutCID = await Lead.find({
            $or: [{ CID: { $exists: false } }, { CID: null }, { CID: '' }],
        }).sort({ createdAt: 1 }); // Sort by creation date to maintain chronological order

        console.log(`Found ${leadsWithoutCID.length} leads without CID`);

        if (leadsWithoutCID.length === 0) {
            console.log('No leads found without CID. Migration not needed.');
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Process leads in batches to avoid memory issues
        const batchSize = 100;
        const totalBatches = Math.ceil(leadsWithoutCID.length / batchSize);

        const processBatch = async (batchIndex) => {
            const startIndex = batchIndex * batchSize;
            const batch = leadsWithoutCID.slice(startIndex, startIndex + batchSize);
            console.log(`Processing batch ${batchIndex + 1}/${totalBatches}...`);

            const batchPromises = batch.map(async (lead) => {
                try {
                    if (!lead.source) {
                        console.warn(`Lead ${lead._id} has no source, skipping...`);
                        return { success: false, error: 'No source' };
                    }

                    // Use the lead's creation date for CID generation
                    const createdDate = lead.createdAt || new Date();
                    const cid = await generateCID(lead.source, createdDate);

                    // Update the lead with the generated CID
                    await Lead.updateOne({ _id: lead._id }, { $set: { CID: cid } });

                    console.log(`✅ Generated CID for lead ${lead._id}: ${cid}`);
                    return { success: true, cid };
                } catch (error) {
                    console.error(`❌ Error generating CID for lead ${lead._id}:`, error.message);
                    return { success: false, error: error.message };
                }
            });

            return Promise.all(batchPromises);
        };

        const processBatches = async () => {
            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
                const results = await processBatch(batchIndex);

                // Count successes and errors
                results.forEach((result) => {
                    if (result.success) {
                        successCount += 1;
                    } else {
                        errorCount += 1;
                        errors.push(result.error);
                    }
                });

                // Add a small delay between batches to avoid overwhelming the database
                if (batchIndex < totalBatches - 1) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 100);
                    });
                }
            }
        };

        await processBatches();

        console.log('\n=== Migration Summary ===');
        console.log(`Total leads processed: ${leadsWithoutCID.length}`);
        console.log(`Successfully migrated: ${successCount}`);
        console.log(`Errors: ${errorCount}`);

        if (errors.length > 0) {
            console.log('\nError details:');
            const errorCounts = {};
            errors.forEach((error) => {
                errorCounts[error] = (errorCounts[error] || 0) + 1;
            });
            Object.entries(errorCounts).forEach(([error, count]) => {
                console.log(`  ${error}: ${count} occurrences`);
            });
        }

        // Verification: Check if all leads now have CIDs
        const remainingLeadsWithoutCID = await Lead.countDocuments({
            $or: [{ CID: { $exists: false } }, { CID: null }, { CID: '' }],
        });

        console.log(`\nVerification: ${remainingLeadsWithoutCID} leads still without CID`);

        if (remainingLeadsWithoutCID === 0) {
            console.log('🎉 Migration completed successfully! All leads now have CIDs.');
        } else {
            console.log("⚠️  Some leads still don't have CIDs. Please review the errors above.");
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run the migration
migrateCIDs();