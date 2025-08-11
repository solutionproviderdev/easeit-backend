// src/middlewares/auth/checkUserId.js
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export function checkUserId(req, res, next) {
	const auth = req.headers.authorization || '';
	const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'NO_AUTH' });

	try {
		const p = jwt.verify(token, process.env.JWT_SECRET);
		const uid = String(p.userId ?? p.id ?? p.sub ?? p._id ?? '');
		if (!Types.ObjectId.isValid(uid)) {
			return res.status(401).json({ error: 'INVALID_UID' });
		}
		req.user = { _id: uid }; // ✅ controller can use req.user._id
		// console.log('[AUTH] uid=', uid); // (optional) debugging
		next();
	} catch {
		return res.status(401).json({ error: 'INVALID_JWT' });
	}
}
