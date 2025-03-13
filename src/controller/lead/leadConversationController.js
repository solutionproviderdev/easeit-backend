/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { default: axios } = require('axios');
const { default: mongoose } = require('mongoose');
const Settings = require('../../schemas/SettingsSchema');
const Lead = require('../../schemas/LeadsSchema');
const { getCreInfo } = require('../../ongoing/getConversationAndUpdateLeadOptimized');
const Department = require('../../schemas/auth/DepartmentSchema');

// reused Functions for only this files.
exports.createNewMessageObject = (messageId, content, senderId, sentByMe, fileUrl = null) => {
    const newMessage = {
        messageId,
        content,
        senderId,
        sentByMe,
        date: new Date(),
    };

    if (fileUrl) {
        newMessage.fileUrl = [fileUrl];
    }

    return newMessage;
};

// Emit Socket.io events for new messages or leads
const emitSocketEventsForNewMessage = async (io, savedLead, pageInfo) => {
    // get cre information
    const cre = await getCreInfo(savedLead.creName);

    // make crename as object if it is not null
    let creName = null;
    if (cre) {
        creName = {
            _id: cre._id,
            name: cre.name,
            profilePicture: cre.profilePicture,
            nickName: cre.nickName,
        };
    }

    const custommersMessages = savedLead.messages.filter((message) => message.sentByMe === false);
    const lastCustomerMessageTime = custommersMessages[custommersMessages.length - 1]?.date;

    const socketPayload = {
        name: savedLead.name,
        lastMessage: savedLead.messages[savedLead.messages.length - 1].content,
        lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
        lastCustomerMessageTime,
        sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
        createdAt: savedLead.createdAt,
        creName,
        pageInfo: {
            pageName: pageInfo.pageName,
            pageId: pageInfo.pageId,
            pageProfilePicture: pageInfo.pageProfilePicture,
        },
        status: savedLead.status,
        _id: savedLead._id,
        messagesSeen: savedLead.messagesSeen,
    };

    io.emit('conversation', socketPayload);
    io.emit('newLead', { newLead: socketPayload });
};

exports.emitNewMessage = (req, leadId, newMessage) => {
    req.io.emit(`fbMessage${leadId}`, newMessage);
};

exports.getAllLeadConversations = async (req, res) => {
    try {
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
                    pageInfo: {
                        pageId: '$pageInfo.pageId',
                        pageName: '$pageInfo.pageName',
                        pageProfilePicture: '$pageInfo.pageProfilePicture',
                    },
                    messagesSeen: '$messagesSeen',
                },
            },
            {
                $project: {
                    name: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    sentByMe: 1,
                    createdAt: 1,
                    status: 1,
                    pageInfo: 1, // Include full pageInfo object
                    creName: 1,
                    messagesSeen: 1,
                    _id: 1,
                },
            },
        ])
            .sort({ lastMessageTime: -1 })
            .skip(skip)
            .limit(limit);

        const totalLeads = await Lead.countDocuments();

        // Extract unique statuses
        const uniqueStatuses = [...new Set(leadsWithLastMessage.map((lead) => lead.status))];
        // const uniqueCRENAME = [...new Set(leadsWithLastMessage.map((lead) => lead.creName))];

        // Extract unique pageInfo objects
        const uniquePagesMap = new Map();
        leadsWithLastMessage.forEach((lead) => {
            const { pageId, pageName, pageProfilePicture } = lead.pageInfo;
            if (!uniquePagesMap.has(pageId)) {
                uniquePagesMap.set(pageId, { pageId, pageName, pageProfilePicture });
            }
        });
        const uniquePages = Array.from(uniquePagesMap.values());

        // Extract unique creNames
        const uniqueCRENames = [];
        const creNamesSet = new Set();

        leadsWithLastMessage.forEach((lead) => {
            const creNameStr = lead?.creName?.toString(); // Convert ObjectId to string
            if (!creNamesSet.has(creNameStr)) {
                creNamesSet.add(creNameStr);
                uniqueCRENames.push(lead.creName); // Push original ObjectId to the result
            }
        });

        // Respond with paginated leads and the conversation objects formatted as required
        res.status(200).json({
            totalLeads,
            totalPages: Math.ceil(totalLeads / limit),
            currentPage: page,
            filters: {
                statuses: uniqueStatuses,
                pages: uniquePages,
                creNames: uniqueCRENames, // Unique CRE names
            },
            leads: leadsWithLastMessage.map((lead) => ({
                name: lead.name,
                lastMessage: lead.lastMessage,
                lastMessageTime: lead.lastMessageTime,
                sentByMe: lead.sentByMe,
                createdAt: lead.createdAt,
                creName: lead.creName,
                status: lead.status,
                _id: lead._id,
                messagesSeen: lead.messagesSeen,
                pageInfo: {
                    pageId: lead.pageInfo.pageId,
                    pageName: lead.pageInfo.pageName,
                    pageProfilePicture: lead.pageInfo.pageProfilePicture,
                },
            })),
        });
    } catch (error) {
        console.error('Error getting leads with last message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllLeadConversationUpdated = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { creId } = req.query;

        const { _id: userId, roleId: userRoleId } = req.user;

        // Build match conditions for aggregation
        const matchConditions = { source: 'Facebook' };
        // If a CRE id is provided, add it to the match filter
        // (assuming creName is stored as ObjectId)
        if (creId) {
            matchConditions.creName = new mongoose.Types.ObjectId(creId);
        }

        // check if the user is a CRE
        // 1. get the cre Department
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        });

        // 2. get the cre Role ID
        const creRoleId = creDepartment.roles.find((role) => role.roleName === 'CRE')._id;

        // 3. check if the user is a CRE
        const isCRE = userRoleId.toString() === creRoleId.toString();

        // If the user is a CRE, add the creName field to the match filter
        if (isCRE) {
            matchConditions.creName = userId;
        }

        const leadsWithLastMessage = await Lead.aggregate([
            {
                $match: matchConditions,
            },
            // Add a field "customerMessages" that contains only messages where sentByMe is false
            {
                $addFields: {
                    customerMessages: {
                        $filter: {
                            input: '$messages',
                            as: 'msg',
                            cond: { $eq: ['$$msg.sentByMe', false] },
                        },
                    },
                },
            },
            // Add the lastCustomerMessageTime field based on the filtered messages
            {
                $addFields: {
                    lastCustomerMessageTime: { $last: '$customerMessages.date' },
                    // Optionally keep other fields from messages if needed:
                    lastMessage: { $last: '$messages.content' },
                    lastMessageTime: { $last: '$messages.date' },
                    sentByMe: { $last: '$messages.sentByMe' },
                },
            },
            {
                $project: {
                    name: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    lastCustomerMessageTime: 1,
                    sentByMe: 1,
                    createdAt: 1,
                    status: 1,
                    pageInfo: 1,
                    creName: 1,
                    messagesSeen: 1,
                    _id: 1,
                },
            },
        ])
            .sort({ lastMessageTime: -1 })
            .skip(skip)
            .limit(limit);

        // Populate creName with details from the User model
        const leadsPopulated = await Lead.populate(leadsWithLastMessage, {
            path: 'creName',
            select: 'nameAsPerNID nickname profilePicture',
            model: 'User',
        });

        // Count total leads using the same match conditions
        const totalLeads = await Lead.countDocuments(matchConditions);

        // Extract unique statuses from the leads
        const uniqueStatuses = [...new Set(leadsPopulated.map((lead) => lead.status))];

        // Extract unique pageInfo objects
        const uniquePagesMap = new Map();
        leadsPopulated.forEach((lead) => {
            if (!lead.pageInfo) {
                console.log('Lead with missing pageInfo:', lead.name);
                return;
            }

            // Extract pageInfo details
            const { pageId, pageName, pageProfilePicture } = lead.pageInfo;

            if (!uniquePagesMap.has(pageId)) {
                uniquePagesMap.set(pageId, { pageId, pageName, pageProfilePicture });
            }
        });
        const uniquePages = Array.from(uniquePagesMap.values());

        // Extract unique CRE names with details
        const uniqueCRENames = [];
        const creNamesSet = new Set();
        leadsPopulated.forEach((lead) => {
            const creDetails = lead.creName;
            if (creDetails && !creNamesSet.has(creDetails._id.toString())) {
                creNamesSet.add(creDetails._id.toString());
                uniqueCRENames.push({
                    _id: creDetails._id,
                    name: creDetails.nameAsPerNID,
                    nickname: creDetails.nickname,
                    profilePicture: creDetails.profilePicture,
                });
            }
        });

        // Respond with paginated leads and formatted conversation objects
        res.status(200).json({
            totalLeads,
            totalPages: Math.ceil(totalLeads / limit),
            currentPage: page,
            filters: {
                statuses: uniqueStatuses,
                pages: uniquePages,
                creNames: uniqueCRENames,
            },
            leads: leadsPopulated.map((lead) => ({
                name: lead.name,
                lastMessage: lead.lastMessage,
                lastMessageTime: lead.lastMessageTime,
                lastCustomerMessageTime: lead.lastCustomerMessageTime, // new field
                sentByMe: lead.sentByMe,
                createdAt: lead.createdAt,
                creName: lead.creName
                    ? {
                          _id: lead.creName._id,
                          name: lead.creName.nameAsPerNID,
                          nickname: lead.creName.nickname,
                          profilePicture: lead.creName.profilePicture,
                      }
                    : null,
                status: lead.status,
                _id: lead._id,
                messagesSeen: lead.messagesSeen,
                pageInfo: {
                    pageId: lead.pageInfo.pageId,
                    pageName: lead.pageInfo.pageName,
                    pageProfilePicture: lead.pageInfo.pageProfilePicture,
                },
            })),
        });
    } catch (error) {
        console.error('Error getting leads with last message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Controller function to get all messages for a specific lead
exports.getMessagesForLead = async (req, res) => {
    const { leadId } = req.params;
    console.log('lead id =', leadId);

    console.log(leadId);

    try {
        // Find the lead by ID
        const lead = await Lead.findById(leadId);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Return the messages for the specific lead
        res.status(200).json({
            messages: lead.messages,
            messagesSeen: lead.messagesSeen, // Include global message seen status
        });
    } catch (error) {
        console.error(`Error fetching messages for lead ${leadId}:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Handler function to mark messages as seen
exports.markMessagesAsSeen = async (req, res) => {
    const { id } = req.params; // Lead ID

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Update the messagesSeen field
        lead.messagesSeen = true;

        // Save the updated lead
        await lead.save();

        res.status(200).json({ msg: 'Messages marked as seen' });
    } catch (error) {
        console.error(`Error marking messages as seen for lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.sendMetaMessage = async (req, res) => {
    const { leadId } = req.params;
    const { messageType, content } = req.body;

    try {
        // Fetch lead details
        const lead = await Lead.findById(leadId);

        if (!lead || !lead.pageInfo.fbSenderID || !lead.pageInfo.pageId) {
            return res
                .status(404)
                .json({ error: 'Lead not found or missing Facebook ID or Page ID' });
        }

        // Fetch Facebook settings
        const settings = await Settings.findOne({ name: 'facebook' });

        if (!settings || !settings.settingsData.page) {
            return res.status(500).json({ error: 'Facebook settings or access token not found' });
        }

        // Find the specific page settings
        const pageSettings = settings.settingsData.page.find(
            (page) => page.pageId == lead.pageInfo.pageId
        );

        if (!pageSettings) {
            return res.status(404).json({ error: 'Facebook page settings not found' });
        }

        const { pageAccessToken, pageId } = pageSettings;
        const newMessages = []; // Array to store new message objects

        // Prepare the base message payload
        const messagePayload = {
            recipient: { id: lead.pageInfo.fbSenderID },
            messaging_type: 'RESPONSE',
            access_token: pageAccessToken, // Include access token in the payload
            message: {},
        };

        // Handle different types of messages
        if (messageType === 'text') {
            messagePayload.message = { text: content.text };

            // Send the text message through Meta API
            const fbResponse = await axios.post(
                `https://graph.facebook.com/v17.0/${pageId}/messages`,
                messagePayload
            );

            if (fbResponse.data && fbResponse.data.message_id) {
                const newMessage = this.createNewMessageObject(
                    fbResponse.data.message_id,
                    content.text,
                    pageId,
                    true
                );
                lead.messages.push(newMessage);
                lead.messagesSeen = true;
                lead.repliedFromSystem = true;
                lead.repliedFromSystem = true;
                await lead.save();

                // Emit Conversation Updated event
                emitSocketEventsForNewMessage(req.io, lead, lead.pageInfo);

                this.emitNewMessage(req, leadId, newMessage);
                newMessages.push(newMessage);
            }
        } else if (['image', 'audio', 'video', 'file'].includes(messageType)) {
            for (const url of content.urls) {
                messagePayload.message = {
                    attachment: {
                        type: messageType,
                        payload: { url, is_reusable: true },
                    },
                };

                // Send the message through Meta API
                const fbResponse = await axios.post(
                    `https://graph.facebook.com/v18.0/${pageId}/messages`,
                    messagePayload
                );

                if (fbResponse.data && fbResponse.data.message_id) {
                    const newMessage = this.createNewMessageObject(
                        fbResponse.data.message_id,
                        '',
                        pageId,
                        true,
                        url
                    );
                    lead.messages.push(newMessage);
                    lead.messagesSeen = true;
                    lead.repliedFromSystem = true;
                    await lead.save();

                    this.emitNewMessage(req, leadId, newMessage);
                    newMessages.push(newMessage);
                }
            }
        } else if (messageType === 'sticker') {
            messagePayload.message = {
                attachment: {
                    type: 'image',
                    payload: { sticker_id: content.sticker_id },
                },
            };

            const fbResponse = await axios.post(
                `https://graph.facebook.com/v17.0/${pageId}/messages`,
                messagePayload
            );

            if (fbResponse.data && fbResponse.data.message_id) {
                const newMessage = this.createNewMessageObject(
                    fbResponse.data.message_id,
                    '',
                    pageId,
                    true,
                    content.sticker_id
                );
                lead.messages.push(newMessage);
                lead.messagesSeen = true;
                lead.repliedFromSystem = true;
                await lead.save();

                this.emitNewMessage(req, leadId, newMessage);
                newMessages.push(newMessage);
            }
        }

        // Return all successfully sent messages
        if (newMessages.length > 0) {
            return res.status(200).json({ messages: newMessages });
        }

        // If no messages were sent
        return res.status(500).json({ error: 'Failed to send message' });
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ error: error.toString() });
    }
};

exports.searchLeads = async (req, res) => {
    const searchParam = req.params.pharams;
    // Read creName from query parameters instead of req.body
    const { creName } = req.query;
    try {
        // --- Search by lead name ---
        const pipelineForNameMatches = [
            {
                $match: { name: { $regex: searchParam, $options: 'i' } },
            },
            // If creName is provided, filter leads that belong to that CRE.
            ...(creName
                ? [
                      {
                          $match: { creName: new mongoose.Types.ObjectId(creName) },
                      },
                  ]
                : []),
            {
                $addFields: {
                    lastMessage: { $last: '$messages.content' },
                    lastMessageTime: { $last: '$messages.date' },
                    sentByMe: { $last: '$messages.sentByMe' },
                    status: '$status',
                    pageInfo: {
                        pageId: '$pageInfo.pageId',
                        pageName: '$pageInfo.pageName',
                        pageProfilePicture: '$pageInfo.pageProfilePicture',
                    },
                    messagesSeen: '$messagesSeen',
                },
            },
            // Populate creName details from the User collection
            {
                $lookup: {
                    from: 'users', // collection name for User
                    localField: 'creName',
                    foreignField: '_id',
                    as: 'creName',
                },
            },
            {
                $unwind: {
                    path: '$creName',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    name: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    sentByMe: 1,
                    createdAt: 1,
                    status: 1,
                    pageInfo: 1,
                    messagesSeen: 1,
                    _id: 1,
                    creName: {
                        _id: '$creName._id',
                        name: '$creName.nameAsPerNID',
                        profilePicture: '$creName.profilePicture',
                    },
                },
            },
            { $sort: { lastMessageTime: -1 } },
        ];

        const nameMatches = await Lead.aggregate(pipelineForNameMatches);

        // --- Search by phone number ---
        const pipelineForPhoneMatches = [
            {
                // Find leads where at least one phone number matches the search parameter
                $match: {
                    phone: { $elemMatch: { $regex: searchParam, $options: 'i' } },
                },
            },
            // If creName is provided, filter leads that belong to that CRE.
            ...(creName
                ? [
                      {
                          $match: { creName: new mongoose.Types.ObjectId(creName) },
                      },
                  ]
                : []),
            {
                $addFields: {
                    matchingPhone: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$phone',
                                    as: 'p',
                                    cond: {
                                        $regexMatch: {
                                            input: '$$p',
                                            regex: searchParam,
                                            options: 'i',
                                        },
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    // Include additional fields for sorting and display
                    lastMessageTime: { $last: '$messages.date' },
                    sentByMe: { $last: '$messages.sentByMe' },
                    status: '$status',
                    pageInfo: {
                        pageId: '$pageInfo.pageId',
                        pageName: '$pageInfo.pageName',
                        pageProfilePicture: '$pageInfo.pageProfilePicture',
                    },
                    messagesSeen: '$messagesSeen',
                },
            },
            // Populate creName details from the User collection
            {
                $lookup: {
                    from: 'users',
                    localField: 'creName',
                    foreignField: '_id',
                    as: 'creName',
                },
            },
            {
                $unwind: {
                    path: '$creName',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                // Instead of "lastMessage", we return the matching phone number in a field called "phone"
                $project: {
                    name: 1,
                    phone: '$matchingPhone',
                    lastMessageTime: 1,
                    sentByMe: 1,
                    createdAt: 1,
                    status: 1,
                    pageInfo: 1,
                    messagesSeen: 1,
                    _id: 1,
                    creName: {
                        _id: '$creName._id',
                        name: '$creName.nameAsPerNID',
                        profilePicture: '$creName.profilePicture',
                    },
                },
            },
            { $sort: { lastMessageTime: -1 } },
        ];

        const phoneMatches = await Lead.aggregate(pipelineForPhoneMatches);

        return res.status(200).json({
            matchedNames: nameMatches,
            matchPhoneNumber: phoneMatches,
        });
    } catch (error) {
        console.error('Error searching leads:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
