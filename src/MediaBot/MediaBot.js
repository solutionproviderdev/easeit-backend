const analyzeImageWithText = require('../utils/analyzeImageWithText');
const downloadAndSaveImage = require('../utils/downloadAndSaveImage');

const DOMAIN = process.env.PUBLIC_DOMAIN || 'https://crm.solutionprovider.com.bd/api';

async function MediaBot(aiPrompt, messages, newMessage, threadId = null, req = null) {
    if (
        Array.isArray(newMessage.fileTypes) &&
        newMessage.fileTypes[0] === 'image' &&
        Array.isArray(newMessage.fileUrl) &&
        newMessage.fileUrl.length > 0
    ) {
        const imageUrls = await Promise.all(
            newMessage.fileUrl.map(async (url) => {
                if (url.startsWith('https')) {
                    try {
                        const filename = await downloadAndSaveImage(url, 'public/images');
                        return `${DOMAIN}/images/${filename}`;
                    } catch (err) {
                        // Optionally skip this image if download fails
                        return null;
                    }
                }
                return url;
            })
        );

        // Filter out any nulls (failed downloads)
        const validImageUrls = imageUrls.filter(Boolean);

        const text = aiPrompt || 'Describe these images for a customer support context.';

        try {
            const reply = await analyzeImageWithText({ text, imageUrl: validImageUrls });
            return { reply, threadId: null };
        } catch (error) {
            return { reply: '', threadId: null };
        }
    } else {
        return { reply: '', threadId: null };
    }
}

module.exports = { MediaBot };
