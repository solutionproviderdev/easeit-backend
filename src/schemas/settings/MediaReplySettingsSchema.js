const mongoose = require('mongoose');

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-5-thinking'];

const mediaConfigSchema = new mongoose.Schema(
	{
		enabled: { type: Boolean, default: false },
		aiEnabled: { type: Boolean, default: false },
		aiModel: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Assistant',
			default: null,
		},
		savedMessageEnabled: { type: Boolean, default: false },
		savedId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'SavedMessage',
			default: null,
		},
	},
	{ _id: false }
);

const mediaReplySettingsSchema = new mongoose.Schema(
  {

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    image: { type: mediaConfigSchema, default: () => ({}) },
    audio: { type: mediaConfigSchema, default: () => ({}) },
    video: { type: mediaConfigSchema, default: () => ({}) },

    // Future: channelOverrides: { whatsapp: mediaConfigSchema, facebook: mediaConfigSchema }
  },
  { timestamps: true }
);

mediaReplySettingsSchema.index({ ownerId: 1 }, { unique: true, sparse: true });
mediaReplySettingsSchema.index({ 'image.enabled': 1, 'audio.enabled': 1, 'video.enabled': 1 });

module.exports = mongoose.model(
	'MediaReplySettingsSchema',
	mediaReplySettingsSchema
);