const OpenAI = require('openai');

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeImageWithText({ text, imageUrl }) {
	// OpenAI API এর জন্য messages তৈরী করা
	const content = [{ type: 'text', text }];

	if (imageUrl) {
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
			messages: messages,
		});

		return response.choices[0].message.content;
	} catch (error) {
		console.error('OpenAI error:', error);
		throw error;
	}
}

module.exports = analyzeImageWithText;
