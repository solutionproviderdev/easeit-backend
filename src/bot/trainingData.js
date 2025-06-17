/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const Lead = require('../schemas/LeadsSchema');

async function exportConversations() {
    const leads = await Lead.find({
        messages: { $exists: true, $not: { $size: 0 } },
    });

    const lines = [];

    for (const lead of leads) {
        const sortedMessages = lead.messages.sort((a, b) => new Date(a.date) - new Date(b.date));
        const messages = [];

        messages.push({
            role: 'system',
            content:
                'You are a friendly CRM assistant that helps qualify interior leads and ask for phone numbers and schedules.',
        });

        for (const msg of sortedMessages) {
            if (!msg.content?.trim()) continue;

            messages.push({
                role: msg.sentByMe ? 'assistant' : 'user',
                content: msg.content.trim(),
            });
        }

        if (messages.length > 3) {
            lines.push(JSON.stringify({ model: 'llama3.2', messages }));
        }
    }

    fs.writeFileSync('training-data.jsonl', lines.join('\n'), 'utf-8');
    console.log('✅ Exported training-data.jsonl with', lines.length, 'conversations');
}

module.exports = exportConversations;
