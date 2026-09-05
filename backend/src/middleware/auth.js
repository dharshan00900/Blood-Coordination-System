const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, phone, role, status FROM users WHERE id = ?').get(decoded.id);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended by administration.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access forbidden. Requires one of roles: [${roles.join(', ')}].` 
      });
    }
    next();
  };
}

function logAudit(userId, action, entity, entityId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, entity, entityId || null, typeof details === 'object' ? JSON.stringify(details) : details, ip);
  } catch (err) {
    console.error('Audit logging error:', err.message);
  }
}

module.exports = {
  authenticate,
  authorize,
  logAudit
};
