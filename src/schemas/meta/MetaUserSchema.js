const mongoose = require('mongoose');

const FbPageSchema = new mongoose.Schema(
	{
		pageId: { type: String, required: true },
		name: String,
		accessToken: String,
		tasks: [String],
		instagramBusinessAccount: String,
	},
	{ _id: false }
);

const FacebookAuthSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			index: true,
			required: true,
		}, // your app user/tenant
		fbUserId: { type: String, index: true },
		fbUserName: String,
		longLivedUserToken: String,
		longLivedTokenIssuedAt: Date,
		pages: [FbPageSchema],
		activePageId: { type: String, index: true }, // <- optional
	},
	{ timestamps: true }
);

module.exports = mongoose.model('FacebookAuth', FacebookAuthSchema);
