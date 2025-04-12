/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const dayjs = require('dayjs');
const User = require('../../schemas/auth/UserSchema');
const Lead = require('../../schemas/LeadsSchema');

// --- Send push notification
async function sendPushNotification(expoPushToken, title, body, metadata = {}) {
	try {
		const message = {
			to: expoPushToken,
			sound: 'default',
			title,
			body,
			data: metadata,
		};

		const response = await axios.post(
			'https://exp.host/--/api/v2/push/send',
			message,
			{
				headers: {
					Accept: 'application/json',
					'Accept-Encoding': 'gzip, deflate',
					'Content-Type': 'application/json',
				},
			}
		);

		console.log(
			'✅✅✅Push✅✅✅Push✅✅✅Push notificaiton Response:-->',
			response.data
		);
	} catch (error) {
		console.error(
			'❌❌❌ Push failed:❌❌❌ Push failed:',
			error.response?.data || error.message
		);
	}
}

// get follwoup funciton
const getUserFollowups = async salesExecutiveId => {
	const now = new Date();

	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		0,
		0,
		0,
		0
	);
	const endOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		23,
		59,
		59,
		999
	);

	try {
		const leads = await Lead.find({
			salesExqName: salesExecutiveId,
			salesFollowUp: { $exists: true, $not: { $size: 0 } },
			'salesFollowUp.status': { $ne: 'Complete' }, // Skip completed
			'salesFollowUp.time': { $gte: startOfToday, $lte: endOfToday },
		})
			.populate('salesExqName', 'nickname profilePicture nameAsPerNID')
			.populate('creName', 'nickname profilePicture nameAsPerNID')
			.populate({
				path: 'salesFollowUp.commentId',
				select: 'comment commentBy',
				populate: { path: 'commentBy', select: 'nickname email' },
			})
			.populate('salesFollowUp.meetingId', 'date slot status salesExecutive')
			.select('-messages -pageInfo -reminder');

		return leads;
	} catch (error) {
		console.error(
			`❌ Error fetching followups for user ${salesExecutiveId}:`,
			error.message
		);
		return [];
	}
};

// --- Process followups for all users
async function processFollowupsForAllUsers() {
	// console.log('🔎 Finding users with mobile push token...');
	const minutesBefore = 11; // <-- If you want 5 minutes before, just change this to 5

	const users = await User.find({
		mobileDeviceToken: { $exists: true, $ne: '' },
	}).select('_id mobileDeviceToken nickname');

	for (const user of users) {
		try {
			const leads = await getUserFollowups(user?._id); // here supoose 2 lead !

			const now = new Date();
			for (const lead of leads) {
				// console.log('single lead is here ok ', lead);
				const userName = lead?.salesExqName?.nickname;
				//is the leads followup arrar took single follwoup for loop
				for (const followup of lead.salesFollowUp) {
					if (followup?.notificationSent) {
						continue; // 🔥 Already sent notification, so skip this followup
					}
					// console.log('single followup is here ok--->', followup);

					const followupTime = new Date(followup.time);

					// Calculate how many milliseconds between now and the followup time
					const timeDifference = followupTime.getTime() - now.getTime();

					// 10 minutes in milliseconds
					const targetDiff = minutesBefore * 60 * 1000; // 10 * 60 * 1000 = 600,000 ms

					if (timeDifference > 0 && timeDifference <= targetDiff) {
						console.log(
							`⏰ Sending pre-notification. Followup time: ${followupTime.toISOString()}`
						); // ${user?.name}
						await sendPushNotification(
							user?.mobileDeviceToken,
							'🛎️ followup Reminder',
							`${userName} You have a followup scheduled at ${followupTime?.toLocaleTimeString()}`,
							{ followupId: followup?._id.toString() }
						);
						// ✅ After sending notification, mark this followup as notification sent
						await Lead.updateOne(
							{ _id: lead._id, 'salesFollowUp._id': followup._id },
							{ $set: { 'salesFollowUp.$.notificationSent': true } }
						);
					}
				}
			}

			console.log(`✅ Finished followups for user: ${user.nickname}`);
		} catch (error) {
			console.error(
				`❌ Error processing followups for user ${user._id}:`,
				error.message
			);
		}
	}
}

// --- Main loop with setTimeout
async function cronsFollowupsForAllUsers() {
	// console.log('🕒 Checking followups...');
	try {
		await processFollowupsForAllUsers(); // ✅ Call here!
	} catch (error) {
		console.error('❌ Error in followup checking:', error.message);
	} finally {
		// console.log('✅ Finished checking. Waiting 1 minute...');
		setTimeout(cronsFollowupsForAllUsers, 60 * 1000); // ✅ Self call for infinite loop
	}
}

// --- Start manually first time
cronsFollowupsForAllUsers();

module.exports = { cronsFollowupsForAllUsers };
