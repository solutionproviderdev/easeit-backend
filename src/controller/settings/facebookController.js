const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Settings = require('../../schemas/SettingsSchema');

// Utility function for downloading profile picture
const downloadProfilePicture = async (url, pageId, req) => {
    const publicDir = path.join(__dirname, '../../../public/profile_pictures');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, `${pageId}.jpg`);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url,
        responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            const fileUrl = `${req.protocol}://${req.get('host')}/profile_pictures/${pageId}.jpg`;
            resolve(fileUrl);
        });
        writer.on('error', (err) => {
            writer.close();
            reject(err);
        });
    });
};

// Get all Facebook pages
const getAllFacebookPages = async (req, res) => {
    try {
        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings) {
            return res.status(404).json({ message: 'No Facebook pages found' });
        }

        res.status(200).json({ pages: settings.settingsData.page || [] });
    } catch (error) {
      //console.error('Error fetching Facebook pages:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Add a new Facebook page
const addFacebookPage = async (req, res) => {
    const { pageAccessToken } = req.body;

    try {
        const url = `https://graph.facebook.com/me?fields=name,id,picture.type(large)&access_token=${pageAccessToken}`;
        const response = await axios.get(url);

        const { name, id, picture } = response.data;

        // Check if the page already exists
        const existingSettings = await Settings.findOne({ name: 'facebook' });
        const existingPage = existingSettings?.settingsData?.page?.find(
            (page) => page.pageId === id
        );

        if (existingPage) {
            return res.status(400).json({ message: 'Page already exists' });
        }

        // Download the profile picture
        const picturePath = await downloadProfilePicture(picture.data.url, id, req);

        const newPage = {
            name,
            pageId: id,
            picture: picturePath,
            pageAccessToken,
        };

        const updatedSettings = await Settings.findOneAndUpdate(
            { name: 'facebook' },
            { $push: { 'settingsData.page': newPage } },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: 'Page added successfully',
            pages: updatedSettings.settingsData.page,
        });
    } catch (error) {
      //console.error('Error adding Facebook page:', error);
        res.status(500).json({ message: 'Error adding Facebook page', error: error.message });
    }
};

// Delete a Facebook page
const deleteFacebookPage = async (req, res) => {
    const { pageId } = req.body;

    try {
        const updatedSettings = await Settings.findOneAndUpdate(
            { name: 'facebook' },
            { $pull: { 'settingsData.page': { pageId } } },
            { new: true }
        );

        if (!updatedSettings) {
            return res.status(404).json({ message: 'Facebook settings not found' });
        }

        res.status(200).json({
            message: 'Page deleted successfully',
            pages: updatedSettings.settingsData.page,
        });
    } catch (error) {
      //console.error('Error deleting Facebook page:', error);
        res.status(500).json({ message: 'Error deleting Facebook page', error: error.message });
    }
};

module.exports = {
    getAllFacebookPages,
    addFacebookPage,
    deleteFacebookPage,
};
