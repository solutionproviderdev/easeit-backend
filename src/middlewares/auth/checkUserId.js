// src/middlewares/auth/checkUserId.js
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');

const checkUserId = (req, res, next) => {
 	const auth = req.headers.authorization || '';
	console.log('checkUserId middleware called with auth:===================>', auth);
	 const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
	 if (!token) return res.status(401).json({ error: 'NO_AUTH' });
 	 
	 try {
		 const p = jwt.verify(token, process.env.JWT_SECRET);
		 const uid = String(p.userId ?? p.id ?? p.sub ?? p._id ?? '');
 
		 try {
			
			 if (!Types.ObjectId.isValid(uid)) {
 				 return res.status(401).json({ error: 'INVALID_UID' });
				}
		 } catch (error) {
 		 }
			req.user = { _id: uid }; // ✅ controller can use req.user._id
  		next();
	} catch {
		return res.status(401).json({ error: 'INVALID_JWT' });
	}
};

module.exports = { checkUserId };
