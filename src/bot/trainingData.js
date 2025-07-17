/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const Lead = require('../schemas/LeadsSchema'); // Importing the Mongoose Lead model

/**
 * Export formatted conversations to JSONL for fine-tuning LLMs like Qwen
 * @param {number} batchSize - Number of training samples to process per batch
 */
async function exportConversationsToJsonl(batchSize = 1000) {
    // Create a MongoDB cursor to stream through leads (instead of loading all into memory)
    const cursor = Lead.find({
        messages: { $exists: true, $not: { $size: 0 } }, // Only leads that have at least 1 message
    }).cursor();

    const outputPath = 'cre-training-data.jsonl'; // Output file path
    const writeStream = fs.createWriteStream(outputPath, { flags: 'w' }); // Stream writer for efficiency

    let batch = []; // Temporarily holds current batch of items
    let count = 0; // Keeps track of total samples written

    for await (const lead of cursor) {
        // Sort messages chronologically
        const sortedMessages = lead.messages.sort((a, b) => new Date(a.date) - new Date(b.date));

        const messages = [];

        // Format messages into { role, content }
        for (const msg of sortedMessages) {
            if (!msg.content?.trim()) continue; // Skip empty messages

            messages.push({
                role: msg.sentByMe ? 'assistant' : 'user', // Determine who sent the message
                content: msg.content.trim(), // Remove surrounding whitespace
            });
        }

        // Must have at least 3 messages (1 user input, 1 assistant output, 1+ context)
        if (messages.length >= 3) {
            batch.push({
                instruction:
                    'তুমি একজন দক্ষ ইন্টেরিয়র ডিজাইন কনসালট্যান্ট। গ্রাহকের সাথে বন্ধুত্বপূর্ণ আচরণ করো, তাদের প্রশ্নের উত্তর দাও এবং ফোন নম্বর ও ফ্রি কনসালটেশন অফার করো।',
                input: messages[0]?.content || '', // First message by user (typically a question)
                output: messages[1]?.content || '', // First response by assistant
                history: messages.slice(2), // Optional: remaining conversation as context
            });
        }

        // If batch is full, write to file
        if (batch.length >= batchSize) {
            for (const line of batch) {
                writeStream.write(`${JSON.stringify(line)}\n`); // Convert to JSONL line
                count++;
            }
            batch = []; // Clear batch
        }
    }

    // Write any remaining samples
    for (const line of batch) {
        writeStream.write(`${JSON.stringify(line)}\n`);
        count++;
    }

    // Close the file stream
    writeStream.end(() => {
        console.log(`✅ Exported ${count} conversations to ${outputPath}`);
    });
}

module.exports = exportConversationsToJsonl;
