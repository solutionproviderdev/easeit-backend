// endpoints/assistants.js

const express = require('express');
const assistantRouter = express.Router();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. List all assistants
assistantRouter.get('/', async (req, res) => {
	console.log('get all list of the assistants------>');
	try {
		const list = await openai.beta.assistants.list();
		res.json(list.data); // Returns array of assistants
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 2. Get a single assistant by ID3
assistantRouter.get('/:id', async (req, res) => {
	try {
		const assistant = await openai.beta.assistants.retrieve(req.params.id);
		res.json(assistant);
	} catch (err) {
		res.status(404).json({ error: 'Not found' });
	}
});

// 3. Create a new assistant
assistantRouter.post('/', async (req, res) => {
	try {
		const { name, instructions, model, tools, file_ids } = req.body;
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
});

// 4. Edit/update an assistant
assistantRouter.put('/:id', async (req, res) => {
	try {
		const { name, instructions, model, tools, file_ids } = req.body;
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
});

// 5. Delete an assistant
assistantRouter.delete('/:id', async (req, res) => {
	try {
		await openai.beta.assistants.del(req.params.id);
		res.json({ success: true });
	} catch (err) {
		res.status(404).json({ error: 'Not found' });
	}
});

assistantRouter.post('/:id/playground', async (req, res) => {
	try {
		const { message } = req.body;
		const assistantId = req.params.id;
console.log('message ishere -------------------------------->', message,'assistantId', assistantId);
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
			await new Promise(res => setTimeout(res, 1000)); // Wait 1 sec
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
		const lastAssistantMsg = messages.data
			.reverse()
			.find(m => m.role === 'assistant');
		res.json({ content: lastAssistantMsg?.content?.[0]?.text?.value || '' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = assistantRouter;
