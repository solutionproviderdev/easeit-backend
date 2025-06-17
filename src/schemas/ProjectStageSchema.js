const mongoose = require('mongoose');

const languageDetailsSchema = new mongoose.Schema(
    {
        title: { type: String },
        description: { type: String },
        tips: [{ type: String }],
    },
    { _id: false }
);

const stageDetailsSchema = new mongoose.Schema(
    {
        image: { type: String },
        en: languageDetailsSchema,
        bn: languageDetailsSchema,
    },
    { _id: false }
);

const projectStageSchema = new mongoose.Schema(
    {
        status: { type: String },
        stageName: { type: String },
        stageDetails: stageDetailsSchema,
    },
    { timestamps: true }
);

module.exports = mongoose.model('ProjectStage', projectStageSchema);
