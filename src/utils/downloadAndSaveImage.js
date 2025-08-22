const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadAndSaveImage(remoteUrl, destFolder) {
    try {
        console.log('[downloadAndSaveImage] Downloading image from:', remoteUrl);
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
            console.log('[downloadAndSaveImage] Created destination folder:', destFolder);
        }

        const response = await axios({ url: remoteUrl, responseType: 'stream' });
        const ext = path.extname(remoteUrl.split('?')[0]) || '.jpg';
        const filename = `image_${Date.now()}${ext}`;
        const filePath = path.join(destFolder, filename);

        // console.log('[downloadAndSaveImage] Saving image to:', filePath);

        await new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(filePath);
            response.data.pipe(stream);
            stream.on('finish', () => {
                console.log('[downloadAndSaveImage] Image saved successfully:', filePath);
                resolve();
            });
            stream.on('error', (err) => {
                console.error('[downloadAndSaveImage] Error saving image:', err);
                reject(err);
            });
        });

        return filename;
    } catch (error) {
        console.error('[downloadAndSaveImage] Error downloading or saving image:', error);
        throw error;
    }
}

module.exports = downloadAndSaveImage;
