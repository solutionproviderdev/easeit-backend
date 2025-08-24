const { OpenAI } = require('openai');
const Assistant = require('../../schemas/settings/Assistant.Schema');
const Settings = require('../../schemas/SettingsSchema');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Get all assistants
 * 1. Fetch from OpenAI
 * 2. Upsert into MongoDB
 * 3. Return the DB snapshot
 */
exports.getAllAssistants = async (req, res) => {
    try {
        // 1. Fresh list from OpenAI
        const { data: openaiList } = await openai.beta.assistants.list();

        // 2. Upsert each assistant
        const bulkOps = openaiList.map((ast) => ({
            updateOne: {
                filter: { id: ast.id }, // unique key
                update: { $set: ast }, // replace whole doc
                upsert: true,
            },
        }));

        await Assistant.bulkWrite(bulkOps, { ordered: false });

        // 3. Return what is now in the DB
        const dbList = await Assistant.find().lean();
        res.json(dbList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createGlobalConfig = async () => {
    // get All FAcebook Pages
    const data = await Settings.findOne({
        name: 'facebook',
    });

    const {
        settingsData: { page: facebookPages },
    } = data;

    // make facbook pages config
    const facebookPagesConfig = facebookPages.map((page) => ({
        picture: page.picture,
        pageId: page.pageId,
        pageName: page.name,
        pageAccessToken: page.pageAccessToken,
        aiEnabled: false,
        assistantId: '',
    }));

    const globalConfig = new Settings({
        name: 'ai-integration',
        settingsData: {
            facebookPages: facebookPagesConfig,
        },
    });

    // create global config
    await globalConfig.save();

    return globalConfig;
};

/**
 * Get global config
 */
exports.getGlobalConfig = async (req, res) => {
    // Implementation for global config
    try {
        let globalConfig = await Settings.findOne({ name: 'ai-integration' });

        if (!globalConfig) {
            globalConfig = await createGlobalConfig();
        }

        res.json(globalConfig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update global config
 */
exports.updateGlobalConfig = async (req, res) => {
    // Implementation for updating global config
    try {
        const { settingsData } = req.body;
        const globalConfig = await Settings.findOneAndUpdate(
            { name: 'ai-integration' },
            { settingsData },
            { new: true }
        );
        res.json(globalConfig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update page AI Integration
 */
exports.updatePageAIIntegration = async (req, res) => {
    // Implementation for updating page AI Integration
    try {
        const { id } = req.params;
        const { assistantId } = req.body;

        const assistant = await Assistant.findOne({ id: assistantId });

        if (!assistant) {
            return res.status(404).json({ error: 'Assistant not found' });
        }

        // update the specific page config in global config
        const globalConfig = await Settings.findOneAndUpdate(
            { name: 'ai-integration' },
            {
                $set: {
                    'settingsData.facebookPages.$[elem].assistantId': assistantId,
                    'settingsData.facebookPages.$[elem].aiEnabled': true,
                },
            },
            {
                arrayFilters: [{ 'elem.pageId': id }],
                new: true,
            }
        );

        if (!globalConfig) {
            return res.status(404).json({ error: 'AI integration settings not found' });
        }

        res.json(globalConfig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Toggle active status of an assistant
 */
exports.toggleActive = async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    try {
        const assistant = await Assistant.findById(id);
        if (!assistant) {
            return res.status(404).json({ error: 'Assistant not found' });
        }

        assistant.active = active;
        await assistant.save();

        res.json(assistant);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get a single assistant by ID
 */
exports.getAssistantById = async (req, res) => {
    try {
        const assistant = await openai.beta.assistants.retrieve(req.params.id);
        res.json(assistant);
    } catch (err) {
        res.status(404).json({ error: 'Not found' });
    }
};

/**
 * Create a new assistant
 */
exports.createAssistant = async (req, res) => {
    try {
        const {
 name, instructions, model, tools, file_ids 
} = req.body;
        const assistant = await openai.beta.assistants.create({
            name,
            instructions,
            model,
            tools, // Optional: [{ type: "code_interpreter" }, ...]
            file_ids, // Optional: [fileId1, fileId2, ...]
        });
        res.status(201).json(assistant);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update an assistant
 */
exports.updateAssistant = async (req, res) => {
    try {
        const {
 name, instructions, model, tools, file_ids 
} = req.body;
        const assistant = await openai.beta.assistants.update(req.params.id, {
            name,
            instructions,
            model,
            tools,
            file_ids,
        });
        res.json(assistant);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete an assistant
 */
exports.deleteAssistant = async (req, res) => {
    try {
        await openai.beta.assistants.del(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(404).json({ error: 'Not found' });
    }
};

/**
 * Test an assistant in playground
 */
exports.testInPlayground = async (req, res) => {
    try {
        const { message } = req.body;
        const assistantId = req.params.id;

        // 1. Create a thread (this is per chat session)
        const thread = await openai.beta.threads.create();

        // 2. Add user message to the thread
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message,
        });

        // 3. Create a run (let the assistant process)
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId,
        });

        // 4. Poll for run completion (simplest way, or use webhook for prod)
        let result;
        let attempts = 0;
        while (attempts < 15) {
            await new Promise((res) => setTimeout(res, 1000)); // Wait 1 sec
            const status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            if (status.status === 'completed') {
                result = status;
                break;
            }
            attempts++;
        }

        if (!result) return res.status(504).json({ error: 'Timeout' });

        // 5. Get latest messages from the thread
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastAssistantMsg = messages.data.reverse().find((m) => m.role === 'assistant');
        res.json({ content: lastAssistantMsg?.content?.[0]?.text?.value || '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
