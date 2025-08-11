const express = require('express');
const router = express.Router();
const { checkUserId } = require('../../middlewares/auth/checkUserId'); // adjust path

// Controllers (you'll create these next)
const {
	fbLoginStart,
	fbLoginCallback,
	fbUnlink,
    fbStatus,
    fbListPages,
    fbSelectPage,
    fbSendMessage
} = require('../../controller/meta/metaAuthController');


// --- AUTH (Facebook OAuth Redirect flow) ---
router.get('/facebook/login-url', checkUserId, fbLoginStart); // builds FB URL & 302 to Facebook
router.get('/facebook/callback', fbLoginCallback); // handles ?code, exchanges tokens, upserts user
router.post('/facebook/unlink', checkUserId,fbUnlink); // optional: remove saved tokens


// --- Pages & Messaging ---
router.get('/facebook/status', checkUserId, fbStatus);
router.get('/facebook/pages', checkUserId, fbListPages);          // list pages with tokens

router.post('/facebook/pages/select', checkUserId, fbSelectPage); // set active + subscribe
router.post('/facebook/messages', checkUserId, fbSendMessage);    // send reply


module.exports = router;
