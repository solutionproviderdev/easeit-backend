const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeImageWithText({ text, imageUrl }) {
    const content = [{ type: 'text', text }];

    // Support multiple images
    if (Array.isArray(imageUrl)) {
        imageUrl.forEach((url) => {
            content.push({
                type: 'image_url',
                image_url: { url },
            });
        });
    } else if (imageUrl) {
        content.push({
            type: 'image_url',
            image_url: { url: imageUrl },
        });
    }

    const messages = [
        {
            role: 'user',
            content,
        },
    ];

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI error:', error);
        throw error;
    }
}

module.exports = analyzeImageWithText;
