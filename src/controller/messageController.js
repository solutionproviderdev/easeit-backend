const Lead = require('../schemas/LeadsSchema');

// Function to get all messages for a specific lead
const getAllMessage = async (req, res) => {
    try {
        const { id } = req.params; // This assumes the ID in the URL is the lead's ID
        const lead = await Lead.findById(id); // Finds the lead by its ID

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Respond with the customer's name and the messages array from the lead document
        res.status(200).json({
            customerName: lead.name,
            messages: lead.messages,
        });
    } catch (error) {
        // Handle possible errors
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getAllMessage };
