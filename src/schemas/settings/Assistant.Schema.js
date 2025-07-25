const mongoose = require('mongoose');

/* ---------- Sub-Schemas ---------- */
const ToolFunctionSchema = new mongoose.Schema(
    {
        name: String,
        description: String,
        parameters: mongoose.Schema.Types.Mixed,
        strict: Boolean,
    },
    { _id: false }
);

const ToolSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['code_interpreter', 'file_search', 'function'],
        },
        file_search: {
            ranking_options: {
                ranker: String,
                score_threshold: Number,
            },
        },
        function: ToolFunctionSchema,
    },
    { _id: false }
);

const ToolResourcesSchema = new mongoose.Schema(
    {
        code_interpreter: { file_ids: [String] },
        file_search: { vector_store_ids: [String] },
    },
    { _id: false }
);

/* ---------- Main Schema ---------- */
const AssistantSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true }, // OpenAI assistant id
        object: { type: String, default: 'assistant' },
        created_at: Number, // epoch seconds
        name: String,
        description: String,
        model: String,
        instructions: String,
        tools: [ToolSchema],
        top_p: Number,
        temperature: Number,
        reasoning_effort: String,
        tool_resources: ToolResourcesSchema,
        metadata: mongoose.Schema.Types.Mixed,
        response_format: mongoose.Schema.Types.Mixed,
        active: { type: Boolean, default: false },
    },
    { collection: 'assistants' }
);
const Assistant = mongoose.model('Assistant', AssistantSchema);

module.exports = Assistant;
