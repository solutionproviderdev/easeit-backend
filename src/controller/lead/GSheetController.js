// controllers/leadReportController.js

const Lead = require('../../schemas/LeadsSchema');

exports.getLeadReportByName = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: 'Name query parameter is required' });
        }

        // Find lead by name (case-insensitive)
        const lead = await Lead.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
        })
            .select('status phone')
            .lean();

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Conditions
        const hasNumber = Array.isArray(lead.phone) && lead.phone.some((p) => p?.trim());
        const meetingFixedStatuses = ['Meeting Fixed', 'Meeting Complete', 'Sold', 'Prospect'];
        const meetingCompleteStatuses = ['Meeting Complete', 'Sold', 'Prospect'];

        const meetingFixed = meetingFixedStatuses.includes(lead.status);
        const meetingComplete = meetingCompleteStatuses.includes(lead.status);
        const sold = lead.status === 'Sold';

        return res.json({
            'Number Collected': hasNumber ? 'Yes' : 'No',
            'Meeting Fixed': meetingFixed ? 'Yes' : 'No',
            'Meeting Complete': meetingComplete ? 'Yes' : 'No',
            Sold: sold ? 'Yes' : 'No',
        });
    } catch (error) {
        console.error('Error fetching lead report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
