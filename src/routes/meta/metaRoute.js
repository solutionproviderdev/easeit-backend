const express = require('express');
const metaRouter = express.Router();
const {checkUserId} = require('../../middlewares/auth/checkUserId'); // adjust path

// Controllers (you'll create these next)
const {
	fbLoginStart,
	fbLoginCallback,
	fbUnlink,
	fbStatus,
	fbListPages,
	fbSelectPage,
	fbSendMessage,
	waLinkStart, // builds ESU URL and returns it (JSON)
	waCallbackGet, // GET callback (query-string delivery)
	waCallbackPost, // POST callback (body delivery – some ESU variants)
	waUnlink, // forget WA ids for tenant/user
	waStatus,
} = require('../../controller/meta/metaAuthController');
const { waQRStart, waQRStatus, waDisconnect } = require('../../controller/meta/waQrController');


// =============== facebook -> AUTH (Facebook OAuth Redirect flow) ===============
metaRouter.get('/facebook/login-url', checkUserId, fbLoginStart); // builds FB URL & 302 to Facebook
metaRouter.get('/facebook/callback', fbLoginCallback); // handles ?code, exchanges tokens, upserts user
metaRouter.post('/facebook/unlink', checkUserId, fbUnlink); // optional: remove saved tokens


// --- Pages & Messaging ---
metaRouter.get('/facebook/status', checkUserId, fbStatus);
metaRouter.get('/facebook/pages', checkUserId, fbListPages);          // list pages with tokens

metaRouter.post('/facebook/pages/select', checkUserId, fbSelectPage); // set active + subscribe
metaRouter.post('/facebook/messages', checkUserId, fbSendMessage);    // send reply



// =============== WHATSAPP (Embedded Signup – Link/Unlink/Status) ===============
// Start ESU – returns {url} to open in popup

metaRouter.get('/whatsapp/link/start',checkUserId, waLinkStart);

// ESU callbacks (add BOTH – Meta can send via GET or POST depending on flow)
metaRouter.get('/whatsapp/callback', waCallbackGet);
metaRouter.post('/whatsapp/callback', waCallbackPost);

// Unlink + Status
metaRouter.post('/whatsapp/unlink', checkUserId, waUnlink);

// metaRouter.get('/whatsapp/status', waStatus);



// =============== WHATSAPP (Using Baileys - QR Code Based Connection) ===============

// Start WhatsApp connection - generates QR code for scanning
metaRouter.get('/whatsapp/qr/start', checkUserId, waQRStart);

// Check QR code status and connection state
metaRouter.get('/whatsapp/qr/status', checkUserId, waQRStatus);

// Disconnect WhatsApp session
metaRouter.post('/whatsapp/disconnect', checkUserId, waDisconnect);


module.exports = metaRouter;


