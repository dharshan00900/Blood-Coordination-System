const notificationService = require('../services/notificationService');
const jwt = require('jsonwebtoken');
const config = require('../config');

class NotificationController {
  getMyNotifications(req, res) {
    try {
      const notifications = notificationService.getUserNotifications(req.user.id);
      const unreadCount = notificationService.getUnreadCount(req.user.id);
      return res.json({ success: true, notifications, unreadCount });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  markRead(req, res) {
    try {
      const notifId = parseInt(req.params.id);
      notificationService.markAsRead(notifId, req.user.id);
      return res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  markAllRead(req, res) {
    try {
      notificationService.markAllAsRead(req.user.id);
      return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  streamSSE(req, res) {
    // Support token via query param for EventSource
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) {
      return res.status(401).json({ message: 'Token required for SSE connection' });
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const userId = decoded.id;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Initial ping
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId })}\n\n`);

      notificationService.addClient(userId, res);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }
}

module.exports = new NotificationController();
