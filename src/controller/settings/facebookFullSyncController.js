/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
const axios = require('axios');
const moment = require('moment');
const Lead = require('../../schemas/LeadsSchema');
const Settings = require('../../schemas/SettingsSchema');
const People = require('../../schemas/PeopleSchema');
const User = require('../../schemas/auth/UserSchema');
const { isAutomatedMessage } = require('../../helpers/isAutomatedMessage');
const facebookHelpers = require('../../helpers/facebookConversations');

// Fetch Facebook settings (pages)
const fetchFacebookSettings = async () => {
    const fbSettings = await Settings.findOne({ name: 'facebook' });
    if (!fbSettings || !fbSettings.settingsData.page) {
        throw new Error('Facebook settings or access tokens not found');
    }
    return fbSettings.settingsData.page;
};

// Map CRE last names to their IDs
const getCREMapping = async () => {
    const cres = await People.find({ role: 'CRE' });
    return Object.fromEntries(cres.map((cre) => [cre.name.split(' ').pop(), cre._id]));
};

// Paginated fetch of conversations with limit 150, following next links
const fetchAllConversationsPaginated = async (pageId, pageAccessToken) => {
    const conversations = [];
    let url = `https://graph.facebook.com/${pageId}/conversations?fields=participants,messages{id,message,created_time,attachments{image_data,video_data,generic_template,mime_type,size,name,file_url,id},from}&limit=10&access_token=${pageAccessToken}`;
    while (url) {
        try {
            const response = await axios.get(url);
            const data = response?.data?.data || [];
            conversations.push(...data);
            const next = response?.data?.paging?.next;
            url = next || null;
        } catch (err) {
            console.error('Error fetching conversations:', err.message);
            break;
        }
    }

    return conversations;
};

// Controller: Full Sync Conversations
const fullSyncConversations = async (req, res) => {
    try {
        const { io } = req;
        const maxIterations = Number(req.body?.maxIterations) || 3;
        const startTime = Date.now();

        console.log('[FullSync] Starting full sync at', new Date().toISOString());
        const pages = await fetchFacebookSettings();
        console.log(`[FullSync] Pages found: ${pages.length}`);
        const nameToCreId = await getCREMapping();

        let totalConversationsProcessed = 0;
        let totalLeadsCreated = 0;
        let totalLeadsUpdated = 0;
        let totalPagesProcessed = 0;
        const errors = [];
        let finalStatus = 'completed';

        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
            console.log(`[FullSync] Iteration ${iteration + 1} of ${maxIterations}`);
            let cycleConversations = 0;
            let cycleCreated = 0;
            let cycleUpdated = 0;

            // Process pages sequentially using classic loops to satisfy lint rules
            for (let pIdx = 0; pIdx < pages.length; pIdx += 1) {
                const page = pages[pIdx];
                const { pageAccessToken, pageId, name, picture } = page;
                console.log(`[FullSync][${pageId}] Begin page '${name}'`);
                const pageInfo = {
                    pageAccessToken,
                    pageId,
                    pageName: name,
                    pageProfilePicture: picture,
                };

                let conversations = [];
                try {
                    conversations = await fetchAllConversationsPaginated(pageId, pageAccessToken);
                    console.log(`[FullSync][${pageId}] Conversations: ${conversations.length}`);
                } catch (err) {
                    const msg = err?.message || String(err);
                    console.error(`[FullSync][${pageId}] Fetch error: ${msg}`);
                    errors.push({
                        scope: 'fetch',
                        pageId,
                        error: msg,
                    });
                    conversations = [];
                }

                cycleConversations += conversations.length;

                for (let cIdx = 0; cIdx < conversations.length; cIdx += 1) {
                    const conversation = conversations[cIdx];
                    try {
                        const result = await facebookHelpers.processConversation(
                            conversation,
                            nameToCreId,
                            io,
                            pageInfo
                        );
                        if (result?.created) cycleCreated += 1;
                        if (result?.updated) cycleUpdated += 1;
                    } catch (err) {
                        const msg = err?.message || String(err);
                        console.error(
                            `[FullSync][${pageId}] Process error conv ${conversation.id}: ${msg}`
                        );
                        errors.push({
                            scope: 'process',
                            pageId,
                            conversationId: conversation.id,
                            error: msg,
                        });
                    }
                }

                totalPagesProcessed += 1;
                console.log(`[FullSync][${pageId}] End page '${name}'`);
            }

            totalConversationsProcessed += cycleConversations;
            totalLeadsCreated += cycleCreated;
            totalLeadsUpdated += cycleUpdated;

            if (cycleConversations === 0) {
                finalStatus = 'no_data';
                console.log('[FullSync] No conversations available; ending sync');
                break;
            }

            if (cycleCreated === 0 && cycleUpdated === 0) {
                finalStatus = 'no_updates';
                console.log('[FullSync] No new updates detected; ending sync');
                break;
            }

            if (iteration + 1 >= maxIterations) {
                finalStatus = 'max_limit';
                console.log('[FullSync] Max iteration limit reached; ending sync');
                break;
            }
        }

        const timeTakenMs = Date.now() - startTime;
        console.log('[FullSync] Completed full sync at', new Date().toISOString());

        return res.status(200).json({
            status: finalStatus,
            totalPagesProcessed,
            totalConversationsProcessed,
            totalLeadsCreated,
            totalLeadsUpdated,
            timeTakenMs,
            errors,
        });
    } catch (error) {
        const msg = error?.message || error?.toString?.() || 'Internal Server Error';
        console.error('[FullSync] Failed:', msg);
        return res.status(500).json({
            status: 'error',
            message: 'Full sync failed',
            error: msg,
        });
    }
};

module.exports = { fullSyncConversations };
