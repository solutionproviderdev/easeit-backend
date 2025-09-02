/* eslint-disable no-restricted-syntax */
const Lead = require('../schemas/LeadsSchema');

const rewriteUnadssigneLead = async () => {
    try {
        // get all the Lead
        const leads = await Lead.find();
        console.log(`Starting to process ${leads.length} leads...`);

        let seenCount = 0;
        let unseenCount = 0;
        let errorCount = 0;
        let processedCount = 0;

        // update all the Lead
        for (const lead of leads) {
            try {
                // get the messages array
                const { messages } = lead;

                // if no message array exist continue to the next one
                if (!messages || messages.length === 0) {
                    console.log(`Skipping lead ${lead._id}: No messages found`);
                    continue;
                }

                // get the last message object
                const lastMessage = messages[messages.length - 1];

                // if the last message was sent by me then make messagesSeen true and save the lead
                // if the last message was not sent by me then make messagesSeen false and save the lead
                lead.messagesSeen = lastMessage.sentByMe;
                await lead.save();

                // Update counters
                if (lead.messagesSeen) {
                    seenCount++;
                } else {
                    unseenCount++;
                }
                processedCount++;

                // Log progress every 100 leads
                if (processedCount % 100 === 0) {
                    console.log(`Progress: ${processedCount}/${leads.length} leads processed`);
                }
            } catch (leadError) {
                errorCount++;
                console.error(`Error processing lead ${lead._id}:`, leadError.message);
                continue; // Continue with next lead even if current one fails
            }
        }

        // Log the final counts
        console.log('\nMessage Status Summary:');
        console.log('------------------------');
        console.log(`Total Leads Found: ${leads.length}`);
        console.log(`Successfully Processed: ${processedCount}`);
        console.log(`Seen Messages: ${seenCount}`);
        console.log(`Unseen Messages: ${unseenCount}`);
        console.log(`Failed to Process: ${errorCount}`);
        console.log('------------------------');
    } catch (error) {
        console.error('Fatal error in rewriteUnadssigneLead:', error);
    }
};

module.exports = rewriteUnadssigneLead;
