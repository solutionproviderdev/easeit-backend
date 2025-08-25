const path = require('path');
const fs = require('fs').promises;
const QRCode = require('qrcode');
const pino = require('pino');

const {
	default: makeWASocket,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	DisconnectReason,
} = require('@whiskeysockets/baileys');

// ---------- small logger helpers ----------
const ts = () => new Date().toISOString();
const LOG = (...a) => console.log(`[WA][${ts()}]`, ...a);
const WARN = (...a) => console.warn(`[WA][WARN][${ts()}]`, ...a);
const ERR = (label, e) =>
	console.error(`[WA][ERR][${ts()}] ${label}`, {
		name: e?.name,
		message: e?.message,
		stack: e?.stack,
	});

// memory stores per user
const activeSessions = new Map(); // userId -> { sock, saveCreds, connected, version }
const qrCodes = new Map(); // userId -> { qr, status, timestamp, error? }

function humanDiscReason(code) {
	const map = {
		[DisconnectReason.badSession]: 'badSession',
		[DisconnectReason.connectionClosed]: 'connectionClosed',
		[DisconnectReason.connectionLost]: 'connectionLost',
		[DisconnectReason.connectionReplaced]: 'connectionReplaced',
		[DisconnectReason.loggedOut]: 'loggedOut',
		[DisconnectReason.restartRequired]: 'restartRequired',
		[DisconnectReason.timedOut]: 'timedOut',
	};
	return map[code] || String(code);
}

exports.waQRStart = async (req, res) => {
	LOG('waQRStart called; req.user =', !!req.user && req.user._id?.toString());
	try {
		if (!req.user?._id) {
			return res.status(401).json({ ok: false, error: 'LOGIN_REQUIRED' });
		}
		const userId = req.user._id.toString();
		const authDir = path.join(__dirname, '../../whatsapp_sessions', userId);

		// reuse session if already connected
		const existing = activeSessions.get(userId);
		if (existing?.connected) {
			return res.json({
				ok: true,
				message: 'Already connected',
				connected: true,
			});
		} else if (existing) {
			activeSessions.delete(userId);
			qrCodes.delete(userId);
		}

		await fs.mkdir(authDir, { recursive: true });
		const { state, saveCreds } = await useMultiFileAuthState(authDir);
		const { version } = await fetchLatestBaileysVersion();

		const sock = makeWASocket({
			version,
			auth: state,
			logger: pino({ level: process.env.WA_LOG_LEVEL || 'info' }),
			printQRInTerminal: false,
			browser: ['YourApp', 'Chrome', '124'],
			connectTimeoutMs: 60_000,
			defaultQueryTimeoutMs: 0,
			keepAliveIntervalMs: 10_000,
			markOnlineOnConnect: false,
			syncFullHistory: false,
		});

		activeSessions.set(userId, { sock, saveCreds, connected: false, version });

		let qrGenerated = false;
		let qrTimeout = null;

		sock.ev.on('creds.update', async () => {
			try {
				await saveCreds();
			} catch (e) {
				ERR('saveCreds', e);
			}
		});

		sock.ev.on('connection.update', async u => {
			const { connection, lastDisconnect, qr } = u || {};
			LOG('[connection.update]', { userId, connection, hasQR: !!qr });

			if (qr && !qrGenerated) {
				try {
					const png = await QRCode.toDataURL(qr);
					qrCodes.set(userId, {
						qr: png,
						status: 'waiting',
						timestamp: Date.now(),
					});
					qrGenerated = true;
				} catch (e) {
					ERR('QRCode', e);
					qrCodes.set(userId, {
						qr: null,
						status: 'failed',
						error: 'QR_ENCODE_FAILED',
					});
				}
			}

			if (connection === 'open') {
				const sess = activeSessions.get(userId);
				if (sess) sess.connected = true;
				qrCodes.set(userId, { qr: null, status: 'connected' });
				if (qrTimeout) clearTimeout(qrTimeout);
			} else if (connection === 'close') {
				const code =
					lastDisconnect?.error?.output?.statusCode ??
					lastDisconnect?.error?.status ??
					lastDisconnect?.error?.code;
				LOG('[connection.close]', {
					userId,
					code,
					human: humanDiscReason(code),
				});

				const prev = qrCodes.get(userId) || {};
				qrCodes.set(userId, {
					...prev,
					status: 'failed',
					error: lastDisconnect?.error?.message,
				});
				const sess = activeSessions.get(userId);
				if (sess) sess.connected = false;
				activeSessions.delete(userId);
				if (qrTimeout) clearTimeout(qrTimeout);
			}
		});

		// QR must appear in time, otherwise clean up
		qrTimeout = setTimeout(() => {
			if (!qrGenerated && activeSessions.has(userId)) {
				WARN('QR timeout for', userId);
				qrCodes.set(userId, {
					qr: null,
					status: 'timeout',
					error: 'QR_TIMEOUT',
				});
				try {
					activeSessions.get(userId)?.sock?.end?.();
				} catch {}
				activeSessions.delete(userId);
			}
		}, 60_000);

		return res.json({
			ok: true,
			message: 'Started. Poll /auth/whatsapp/qr/status for QR/status.',
			session_id: userId,
		});
	} catch (e) {
		ERR('waQRStart', e);
		return res
			.status(500)
			.json({ ok: false, error: e?.message || 'Failed to start' });
	}
};

exports.waQRStatus = async (req, res) => {
	try {
		if (!req.user?._id)
			return res.status(401).json({ ok: false, error: 'LOGIN_REQUIRED' });
		const userId = req.user._id.toString();

		const sess = activeSessions.get(userId);
		const qr = qrCodes.get(userId);

		if (!sess && !qr) return res.json({ ok: true, status: 'not_started' });
		if (sess?.connected)
			return res.json({ ok: true, status: 'connected', user: sess.sock.user });
		if (qr)
			return res.json({
				ok: true,
				status: qr.status,
				qr: qr.qr,
				error: qr.error || null,
			});

		return res.json({ ok: true, status: 'loading' });
	} catch (e) {
		ERR('waQRStatus', e);
		return res
			.status(500)
			.json({ ok: false, error: e?.message || 'status failed' });
	}
};

exports.waDisconnect = async (req, res) => {
	try {
		if (!req.user?._id)
			return res.status(401).json({ ok: false, error: 'LOGIN_REQUIRED' });
		const userId = req.user._id.toString();

		const sess = activeSessions.get(userId);
		if (sess?.sock) {
			try {
				await sess.sock.logout();
			} catch {}
			try {
				sess.sock.end();
			} catch {}
		}
		activeSessions.delete(userId);
		qrCodes.delete(userId);

		const authDir = path.join(__dirname, '../../whatsapp_sessions', userId);
		try {
			await fs.rm(authDir, { recursive: true, force: true });
		} catch {}

		res.json({ ok: true, message: 'Disconnected' });
	} catch (e) {
		ERR('waDisconnect', e);
		res
			.status(500)
			.json({ ok: false, error: e?.message || 'disconnect failed' });
	}
};

// IMPORTANT: export an object with the three handlers:
module.exports = {
	waQRStart: exports.waQRStart,
	waQRStatus: exports.waQRStatus,
	waDisconnect: exports.waDisconnect,
};
