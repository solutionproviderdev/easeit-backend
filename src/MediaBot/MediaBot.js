const analyzeImageWithText = require('../utils/analyzeImageWithText');
const downloadAndSaveImage = require('../utils/downloadAndSaveImage');

const DOMAIN = process.env.PUBLIC_DOMAIN || 'https://crm.solutionprovider.com.bd/api';

async function MediaBot(aiPrompt, messages, newMessage, threadId = null, req = null) {
    // console.log('[MediaBot] Called with:', {
    //     aiModel,
    //     messagesLength: messages.length,
    //     newMessage,
    //     threadId,
    // });

    if (
        Array.isArray(newMessage.fileTypes) &&
        newMessage.fileTypes[0] === 'image' &&
        Array.isArray(newMessage.fileUrl) &&
        newMessage.fileUrl[0]
    ) {
        let imageUrl = newMessage.fileUrl[0];

        // If the imageUrl is a Facebook CDN or remote URL, download and save it locally
        if (imageUrl.startsWith('https')) {
            try {
                const filename = await downloadAndSaveImage(imageUrl, 'public/images');
                imageUrl = `${DOMAIN}/images/${filename}`;
                // console.log('[MediaBot] Downloaded and saved image:', imageUrl);
            } catch (err) {
                // console.error('[MediaBot] Failed to download image:', err);
                return { reply: '', threadId: null };
            }
        }

        const text = aiPrompt || 'Describe this image for a customer support context.';
        // console.log('[MediaBot] Detected image message:', { text, imageUrl });

        try {
            const reply = await analyzeImageWithText({ text, imageUrl });
            // console.log('[MediaBot] Vision AI reply:', reply);
            return { reply, threadId: null };
        } catch (error) {
            // console.error('[MediaBot] Vision AI error:', error);
            return { reply: '', threadId: null };
        }
    } else {
        // console.log('[MediaBot] No image detected in newMessage:', newMessage);
        return { reply: '', threadId: null };
    }
}

module.exports = { MediaBot };
