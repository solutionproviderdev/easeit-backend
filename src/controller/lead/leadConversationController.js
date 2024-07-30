const { default: axios } = require('axios');
const Lead = require('../../schemas/LeadsSchema');
const Settings = require('../../schemas/SettingsSchema');

const getAllLeadConversations = async (req, res) => {
    try {
        // Get the page and limit from query string, default to 1 and 10 if not provided
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 1;
        const skip = (page - 1) * limit;
        // console.log('limit page console hare', limit, page, skip);

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

const getLeadConversationDetails = async (req, res) => {
    // console.log('its exicuted hare ok hare :---', req.params);
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id)
          .select('name messages')
          .populate({
            path: 'messages.senderId',
            select: 'name avatar',
          });
    
        if (!lead) {
          return res.status(404).json({ message: 'Lead not found' });
        }
    // console.log(lead)
        res.status(200).json({ name: lead.name, messages: lead.messages });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'There was a server side error' });
      }

};

const sendMessage = async (req, res) => {
    const leadId = req.params.id;
    const messageText = req.body.message;
    console.log('send message mutation', leadId, 'message content', messageText);
    try {
        const lead = await Lead.findById(leadId);
        if (!lead || !lead.fbSenderID) {
            return res.status(404).json({ error: 'Lead not found or missing Facebook ID' });
        }

        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page[0].pageAccessToken) {
            return res.status(500).json({ error: 'Facebook settings or access token not found' });
        }
        const { pageAccessToken, pageId } = settings.settingsData.page[0];
        // Determine the message type based on the time elapsed since the last message
        const lastMessage = lead.messages[lead.messages.length - 1];
        const timeElapsed = Date.now() - new Date(lastMessage.date).getTime();
        const messagingType = timeElapsed > 24 * 60 * 60 * 1000 ? 'UPDATE' : 'RESPONSE';

        const messagePayload = {
            recipient: { id: lead.fbSenderID },
            message: { text: messageText },
            messaging_type: messagingType,
            access_token: pageAccessToken,   
        };

        const fbResponse = await axios.post(
			`https://graph.facebook.com/${pageId}/messages`,
            messagePayload
        );
		console.log('95 er --fbResponse ashche :', fbResponse)

        if (fbResponse.data && fbResponse.data.message_id) {
            const newMessage = {
                messageId: fbResponse.data.message_id,
                content: messageText,
                senderId: pageId,
                sentByMe: true,
                date: new Date(),
            };
            lead.messages.push(newMessage);
            const savedLead = await lead.save();

            // Emit the new message to all clients listening on the 'message' event
            req.io.emit(`fbMessage${leadId}`, newMessage);

            const socketPayload = {
                name: savedLead.name,
                lastMessage: savedLead.messages[savedLead.messages.length - 1].content,
                lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
                sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
                createdAt: savedLead.createdAt,
                _id: savedLead._id,
            };
            req.io.emit('conversation', socketPayload);

            return res.status(200).json({ success: true, data: newMessage });
        }
        return res.status(500).json({ error: 'Failed to send message' });
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            console.log('123 error:', error.response.data.error.message)
            return res.status(500).json({ error: error.response.data.error.message });
        }
        console.log(error);
		console.log('123 error:', error.response.data.error.message)
        return res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = { getAllLeadConversations, getLeadConversationDetails, sendMessage };
