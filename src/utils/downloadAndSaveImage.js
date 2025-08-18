const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadAndSaveImage(remoteUrl, destFolder) {
    const response = await axios({ url: remoteUrl, responseType: 'stream' });
    console.log('[downloadAndSaveImage] Downloading image from:-----', remoteUrl);
    const ext = path.extname(remoteUrl.split('?')[0]) || '.jpg';
    const filename = `image_${Date.now()}${ext}`;
    const filePath = path.join(destFolder, filename);

    await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(filePath);
        response.data.pipe(stream);
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    return filename;
}

module.exports = downloadAndSaveImage;
