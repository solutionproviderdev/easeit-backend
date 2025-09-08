const express = require('express');

const assistantRouter = express.Router();
const { OpenAI } = require('openai');
const Assistant = require('../../../schemas/settings/Assistant.Schema');
const {
    getAssistantById,
    getAllAssistants,
    toggleActive,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    testInPlayground,
    getGlobalConfig,
} = require('../../../controller/settings/assistantController');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * GET /assistants
 * 1. Fetch from OpenAI
 * 2. Upsert into MongoDB
 * 3. Return the DB snapshot
 */
assistantRouter.get('/', getAllAssistants);

// route for toggle active assistant
assistantRouter.put('/:id/toggle-active', toggleActive);

// 2. Get a single assistant by ID3
assistantRouter.get('/:id', getAssistantById);

// 3. Create a new assistant
assistantRouter.post('/', createAssistant);

// 4. Edit/update an assistant
assistantRouter.put('/:id', updateAssistant);

// 5. Delete an assistant
assistantRouter.delete('/:id', deleteAssistant);

assistantRouter.post('/:id/playground', testInPlayground);

module.exports = assistantRouter;
