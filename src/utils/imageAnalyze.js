/**\
 * how to utilize !
 * Utility function যা গ্রহণ করবে user input (text + optional image_url),
 * OpenAI API এর জন্য ঠিক ফরম্যাটে রূপান্তর করবে, এবং রেসপন্স দিবে।
 *
 * @param {string} text - ইউজারের টেক্সট মেসেজ
 * @param {string} [imageUrl] - ইমেজের সরাসরি URL (ঐচ্ছিক)
 * @returns {Promise<string>} - OpenAI থেকে প্রাপ্ত রেসপন্স টেক্সট
 * 
 * 
 * assistantRouter.post('/analyze', async (req, res) => {
  try {
    const { text, imageUrl } = req.body; // শুধু সাধারণ ফিল্ড নিন
 
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
 
    const result = await analyzeImageWithText({ text, imageUrl });
 
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
 });
 * 
 * {
  "text": "Analyze this photo as a exprert interior consultent. and then descrive the photo that what actually this is ok !",
  "imageUrl": "https://images.unsplash.com/photo-1559965368-a6adb91e12fe?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aGFtbW9ja3xlbnwwfHwwfHx8MA%3D%3D"
}
 * 
 */


import OpenAI from 'openai';

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

export default analyzeImageWithText;



