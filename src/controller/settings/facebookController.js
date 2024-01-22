const axios = require('axios');
const Settings = require('../../schemas/SettingsSchema');

const getFacebookSettings = async (req, res) => {
    try {
        const settingsArray = await Settings.find({ name: 'facebook' });
        if (settingsArray.length === 0) {
            return res.status(404).json({ error: 'Settings not found' });
        }

        const settings = settingsArray[0]; // Access the first element of the array

        const response = {
            webhookToken: settings.settingsData.webhookToken,
            page: settings.settingsData.page,
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const getPageNamePhoto = async (accessToken) => {
    try {
        const url = `https://graph.facebook.com/me?fields=name,id,picture&access_token=${accessToken}`;
        const response = await axios.get(url);

        const { name, id, picture } = response.data;
        return {
            name,
            pageId: id,
            picture: picture.data.url,
        };
    } catch (error) {
        console.error('Error fetching page data:');
        return null; // or handle the error as needed
    }
};

const postFacebookSettings = async (req, res) => {
    const {
        name,
        settingsData: { webhookToken },
    } = req.body;

    try {
        const newFbSettings = new Settings({
            name,
            settingsData: { page: [], webhookToken },
        });

        const savedSettings = await newFbSettings.save();
        res.status(200).json({ message: 'Settings Added Successfully', settings: savedSettings });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error', messege: error });
    }
};

const putFacebookSettings = async (req, res) => {
    const { name, settingsData } = req.body;
    try {
        const result = await Settings.findOneAndUpdate(
            { name },
            { $set: { settingsData } },
            { upsert: true, new: true, runValidators: true }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const addFacebookPage = async (req, res) => {
    const { pageAccessToken } = req.body;

    try {
        // Get page details using the provided accessToken
        const pageDetails = await getPageNamePhoto(pageAccessToken);

        if (!pageDetails) {
            return res.status(404).json({ error: 'Unable to fetch page details' });
        }

        // Find the existing facebook document and update it
        const updatedSettings = await Settings.findOneAndUpdate(
            { name: 'facebook' }, // Filter to find the document
            { $push: { 'settingsData.page': { ...pageDetails, pageAccessToken } } }, // Update operation
            { new: true } // Return the updated document
        );

        if (!updatedSettings) {
            return res.status(404).json({ error: 'Facebook settings not found' });
        }

        res.status(200).json({ message: 'Page added successfully', settings: updatedSettings });
    } catch (error) {
        console.error('Error adding Facebook page:', error);
        res.status(500).json({ error: 'There was a server side error', message: error.message });
    }
};

const deleteFacebookPage = async (req, res) => {
    const { pageName } = req.body;

    try {
        // Find the existing facebook document and update it
        const updatedSettings = await Settings.findOneAndUpdate(
            { name: 'facebook' }, // Filter to find the document
            { $pull: { 'settingsData.page': { name: pageName } } }, // Update operation to remove the page
            { new: true } // Return the updated document
        );

        if (!updatedSettings) {
            return res.status(404).json({ error: 'Facebook settings not found' });
        }

        res.status(200).json({ message: 'Page deleted successfully', settings: updatedSettings });
    } catch (error) {
        console.error('Error deleting Facebook page:', error);
        res.status(500).json({ error: 'There was a server side error', message: error.message });
    }
};

const deleteFacebookSettings = async (req, res) => {
    try {
        await Settings.deleteOne({ name: 'facebook' });
        res.status(200).json({ message: 'Settings Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

module.exports = {
    addFacebookPage,
    getFacebookSettings,
    deleteFacebookPage,
    postFacebookSettings,
    putFacebookSettings,
    deleteFacebookSettings,
};
