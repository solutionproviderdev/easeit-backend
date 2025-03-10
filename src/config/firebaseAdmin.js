const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase/easeit-b205a-firebase-adminsdk-fbsvc-19885952d6.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

module.exports = { messaging };
