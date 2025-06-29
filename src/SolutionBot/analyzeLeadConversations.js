/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const Lead = require('../schemas/LeadsSchema');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractRetryDelay = (error) => {
    try {
        const retryInfo = error?.errorDetails?.find(
            (d) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        );
        const seconds = retryInfo?.retryDelay?.replace('s', '') || '0';
        return parseInt(seconds);
    } catch {
        return null;
    }
};

const analyzeLeadConversations = async (adminUserId = '67155695d1c51105eeefadf5') => {
    try {
        const leads = await Lead.find({
            messages: { $exists: true, $not: { $size: 0 } },
        });

        const results = [];

        for (const lead of leads) {
            const { messages, comment } = lead;

            if (!messages || messages.length < 3) continue;

            if (comment?.some((c) => c.commentBy?.toString() === adminUserId)) {
                console.log(`⏩ Skipping lead "${lead.name}" - already commented.`);
                continue;
            }

            const chatHistory = messages
                .slice(-15)
                .map((msg) => {
                    const time = new Date(msg.date).toLocaleString('en-GB', {
                        hour12: false,
                    });
                    return `[${time}] ${msg.sentByMe ? 'CRM' : 'Lead'}: ${msg.content}`;
                })
                .join('\n');

            const prompt = `
You are an interior sales CRM evaluator AI.

Your task is to analyze a CRM chat and return structured feedback in JSON.

You must return:
1. comment: A short summary (≤200 characters) about how the lead was handled.
2. score: An overall quality score from 0 to 10.
3. mistakeKeywords: Words/phrases that were poor choices (e.g. delay, unprofessional tone, ignored query).
4. shouldHaveConsideredKeywords: Topics or themes that should have been addressed but were missed (e.g. pricing, location, follow-up, showroom).

Evaluation Criteria:
- Were all lead queries answered?
- Was it professional, complete, timely?
- Did CRM follow up or miss chances?
- Was there a sales intent or clear CTA?

Return JSON only:
{
  "comment": "short summary",
  "score": 0-10,
  "mistakeKeywords": ["...", "..."],
  "shouldHaveConsideredKeywords": ["...", "..."]
}

Transcript:
${chatHistory}
`.trim();

            let retry = true;
            let attempt = 0;

            while (retry && attempt < 3) {
                try {
                    const response = await model.generateContent(prompt);
                    const rawText = response.response.text();

                    const cleaned = rawText.replace(/```json|```/g, '').trim();
                    const parsed = JSON.parse(cleaned);

                    const commentObject = {
                        comment: `${parsed.comment} (Score: ${parsed.score}/10)`,
                        commentBy: adminUserId,
                        date: new Date(),
                    };

                    lead.comment.push(commentObject);
                    await lead.save();

                    results.push({
                        name: lead.name,
                        leadId: lead._id.toString(),
                        score: parsed.score,
                        comment: parsed.comment,
                        mistakeKeywords: parsed.mistakeKeywords?.join(', ') || '',
                        shouldHaveConsideredKeywords:
                            parsed.shouldHaveConsideredKeywords?.join(', ') || '',
                    });

                    console.log(
                        `✅ Commented: ${lead.name} - ${parsed.comment} (Score: ${parsed.score}/10)`
                    );

                    retry = false;
                    await delay(1500); // brief delay before next request
                } catch (error) {
                    const is429 = error?.status === 429;
                    const retryDelay = extractRetryDelay(error);

                    if (is429 && retryDelay) {
                        console.warn(`⚠️ Rate limit hit. Waiting ${retryDelay}s...`);
                        await delay(retryDelay * 1000);
                        attempt++;
                    } else {
                        console.error(`❌ Error with lead "${lead.name}":`, error.message || error);
                        retry = false;
                    }
                }
            }
        }

        // Export to CSV if there are any results
        if (results.length > 0) {
            const fields = [
                'name',
                'leadId',
                'score',
                'comment',
                'mistakeKeywords',
                'shouldHaveConsideredKeywords',
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(results);

            const outputPath = path.join(__dirname, 'lead_analysis_output.csv');
            fs.writeFileSync(outputPath, csv);
            console.log(`📁 CSV saved to: ${outputPath}`);
        }

        console.log('🎯 All eligible leads evaluated and exported.');
    } catch (err) {
        console.error('❌ Fatal error during lead analysis:', err);
    }
};

module.exports = analyzeLeadConversations;
