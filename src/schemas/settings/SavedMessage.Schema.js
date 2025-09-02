const mongoose = require('mongoose');

const savedMessageSchema = new mongoose.Schema(
	{
		// Who created it
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},

		// Message title (optional, for quick identification)
		title: { type: String, trim: true },

		// Actual saved message text
		message: { type: String, required: true, trim: true },

		// Optional tags for searching/filtering
		tags: [{ type: String, trim: true }],

		// Soft delete option
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

// List my messages fast (and paginate by newest)
savedMessageSchema.index({ createdBy: 1, isActive: 1, createdAt: -1 });

// Filter by tag(s) for a user
savedMessageSchema.index({ createdBy: 1, tags: 1 });

// Quick full‑text search on title/message
savedMessageSchema.index({ title: 'text', message: 'text' }, { weights: { title: 3, message: 1 } });


module.exports = mongoose.model('SavedMessage', savedMessageSchema);
