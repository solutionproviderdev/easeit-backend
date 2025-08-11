const axios = require('axios'); // Make sure to install axios or another HTTP client if not already done
const Lead = require('../schemas/LeadsSchema');

// Function to get the sender's name using the Graph API
async function getSendersName(senderId) {
	try {
		const response = await axios.get(
			`https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`
		);

		return `${response.data.first_name} ${response.data.last_name}`;
	} catch (error) {
		console.error('Error fetching sender name:', error);
		return null;
	}
}

const addFbLead = async (req, res) => {
	const messagingEvent = req.body.entry[0].messaging[0];

	if (messagingEvent && messagingEvent.message) {
		const senderId = messagingEvent.sender.id; // The Facebook sender ID
		const message = messagingEvent.message.text;

		// Fetch the sender's name
		const senderName = await getSendersName(senderId);

		try {
			let lead = await Lead.findOne({ fbSenderID: senderId });

			if (lead) {
				// Lead exists, update the last message
				lead.lastMsg = message;
				await lead.save();
			} else {
				// Lead does not exist, create a new one
				lead = new Lead({
					name: senderName, // Placeholder name
					lastMsg: message,
					fbSenderID: senderId,
					source: 'Facebook',
					status: 'unread', // Default status
					creName: 'default', // Default CRE name
					// Add other fields with default or empty values as necessary
				});

				await lead.save();
			}

			res.sendStatus(200); // Acknowledge the request
		} catch (error) {
			console.error('Error handling Facebook webhook:', error);
			res.status(500).send('Server Error');
		}
	} else {
		// If there's no message event, just acknowledge the request
		res.sendStatus(200);
	}
};

const verifyWhatsappWebhook = (req, res) => {
	const VERIFY_TOKEN = 'apple';
	const mode = req.query['hub.mode'];
	const token = req.query['hub.verify_token'];
	const challenge = req.query['hub.challenge'];

	if (mode && token && challenge) {
		if (mode === 'subscribe' && token === VERIFY_TOKEN) {
			console.log('WEBHOOK_VERIFIED');
			res.status(200).send(challenge.toString()); // Force string
		} else {
			console.log('Verification failed: Token mismatch');
			res.sendStatus(403);
		}
	} else {
		console.log('Verification failed: Missing parameters');
		res.sendStatus(400);
	}
};

const receiveWhatsappMessage = (req, res) => {
	try {
		const { body } = req;

		console.log('📩 Incoming WhatsApp message:', JSON.stringify(body, null, 2));

		if (body.object) {
			const entry = body.entry?.[0];
			const changes = entry?.changes?.[0];
			const value = changes?.value;

			const messages = value?.messages;
			const contacts = value?.contacts;

			if (messages && contacts) {
				const message = messages[0];
				const contact = contacts[0];

				const { from } = message; // phone number
				const text = message.text?.body || '';
				const name = contact.profile?.name;

				console.log(`📥 Message from ${name} (${from}): ${text}`);
			}
			res.sendStatus(200);
		} else {
			res.sendStatus(404);
		}
	} catch (err) {
		console.error('❌ Error in receiving WhatsApp message:', err);
		res.sendStatus(500);
	}
};



// meta webhooks ---->
// routes
// GET for verification
const metaWebhookVerify = (req, res) => {
  const VERIFY = process.env.META_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY) return res.status(200).send(challenge);
  return res.sendStatus(403);
};

// POST for events
const metaWebhookReceive = (req, res) => {
  // Always 200 fast
  res.sendStatus(200);

  try {
    const body = req.body;
    // Page messaging events
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.messaging || []) {
          // Example: text message
          const psid = change.sender?.id;
          const pageId = entry.id;
          const text = change.message?.text;
          console.log('[WEBHOOK][msg]', { pageId, psid, text });
          // TODO: upsert conversation, push to queue, etc.
        }
      }
    }
  } catch (e) {
    console.error('[WEBHOOK][error]', e);
  }
};


module.exports = { addFbLead, verifyWhatsappWebhook, receiveWhatsappMessage, metaWebhookVerify, metaWebhookReceive };
