const Lead = require('../../schemas/LeadsSchema');

const getAllLeadConversations = async (req, res) => {
    try {
        // Get the page and limit from query string, default to 1 and 10 if not provided
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const leadsWithLastMessage = await Lead.aggregate([
            {
                $addFields: {
                    lastMessage: { $last: '$messages.content' },
                    lastMessageTime: { $last: '$messages.date' },
                    sentByMe: { $last: '$messages.sentByMe' },
                    status: '$status',
                },
            },
            {
                $project: {
                    name: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    createdAt: 1,
                    status: 1,
                    sourcePageName: 1,
                    sourcePageId: 1,
                    sourcePageProfilePicture: 1,
                    sentByMe: 1,
                    creName: 1,
                },
            },
        ])
            .sort({ lastMessageTime: -1 })
            .skip(skip)
            .limit(limit);

        // Get the total count of leads
        const totalLeads = await Lead.countDocuments();

        res.status(200).json({
            totalLeads,
            totalPages: Math.ceil(totalLeads / limit),
            currentPage: page,
            leads: leadsWithLastMessage,
        });
    } catch (error) {
        console.error('Error getting leads with last message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = getAllLeadConversations;
