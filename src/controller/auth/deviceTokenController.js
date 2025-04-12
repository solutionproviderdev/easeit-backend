const User = require('../../schemas/auth/UserSchema');

/**
 * Add a device token for a user.
 * If the token already exists, it won't be added again.
 * POST /device-token
 * Request body: { userId, deviceToken }
 */
exports.addDeviceToken = async (req, res) => {
	try {
		const { deviceToken } = req.body;
		const { _id: userId } = req.user;
		if (!userId || !deviceToken) {
			return res.status(400).json({
				success: false,
				message: 'userId and deviceToken are required',
			});
		}

		// Retrieve the current user's device tokens
		const user = await User.findById(userId).select('deviceTokens');

		// Check if the device token already exists
		if (user.deviceTokens && user.deviceTokens.includes(deviceToken)) {
			return res.status(200).json({
				success: true,
				message: 'Device token already exists',
			});
		}

		// If not, add token using $addToSet to avoid duplicates
		await User.updateOne(
			{ _id: userId },
			{ $addToSet: { deviceTokens: deviceToken } }
		);

		res
			.status(200)
			.json({ success: true, message: 'Device token added successfully' });
	} catch (error) {
		//console.error('Error adding device token:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

/**
 * Remove a device token for a user.
 * POST /device-token/remove
 * Request body: { userId, deviceToken }
 */
exports.removeDeviceToken = async (req, res) => {
	try {
		const { userId, deviceToken } = req.body;
		if (!userId || !deviceToken) {
			return res.status(400).json({
				success: false,
				message: 'userId and deviceToken are required',
			});
		}

		// Remove token from the deviceTokens array
		await User.updateOne(
			{ _id: userId },
			{ $pull: { deviceTokens: deviceToken } }
		);

		res
			.status(200)
			.json({ success: true, message: 'Device token removed successfully' });
	} catch (error) {
		//console.error('Error removing device token:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

exports.addMobileDeviceToken = async (req, res) => {
	try {
		const { userId, mobileDeviceToken } = req.body;

		if (!userId || !mobileDeviceToken) {
			return res.status(400).json({
				success: false,
				message: 'userId and deviceToken are required',
			});
		}
		// Update the user's mobileDeviceToken field
		const response = await User.updateOne(
			{ _id: userId },
			{ mobileDeviceToken: mobileDeviceToken }
		);
		console.log('token saved', response);
		res.status(200).json({
			success: true,
			message: 'Mobile device token added successfully',
		});
	} catch (error) {
		console.error('Error adding mobile device token:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
