const db = require('../db/database');

class NotificationService {
  constructor() {
    // Active SSE client connections: Map<userId, Set<res>>
    this.clients = new Map();
  }

  /**
   * Register a new SSE client
   */
  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(res);

    res.on('close', () => {
      const userConns = this.clients.get(userId);
      if (userConns) {
        userConns.delete(res);
        if (userConns.size === 0) {
          this.clients.delete(userId);
        }
      }
    });
  }

  /**
   * Send notification to a specific user (DB + live SSE if connected)
   */
  notifyUser(userId, { requestId, notificationType, title, message, urgency = 'NORMAL' }) {
    const info = db.prepare(`
      INSERT INTO notifications (user_id, request_id, notification_type, title, message, urgency, status)
      VALUES (?, ?, ?, ?, ?, ?, 'UNREAD')
    `).run(userId, requestId || null, notificationType, title, message, urgency);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);

    // Push live SSE event
    const userConns = this.clients.get(userId);
    if (userConns && userConns.size > 0) {
      const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION', notification })}\n\n`;
      userConns.forEach(res => {
        try {
          res.write(payload);
        } catch (e) {
          // connection closed
        }
      });
    }

    return notification;
  }

  /**
   * Broadcast general update (e.g., to hospital or admin dashboards)
   */
  broadcastToRole(role, eventType, data) {
    const users = db.prepare('SELECT id FROM users WHERE role = ? AND status = "active"').all(role);
    users.forEach(u => {
      const userConns = this.clients.get(u.id);
      if (userConns && userConns.size > 0) {
        const payload = `data: ${JSON.stringify({ type: eventType, data })}\n\n`;
        userConns.forEach(res => {
          try {
            res.write(payload);
          } catch (e) {}
        });
      }
    });
  }

  getUserNotifications(userId, limit = 30) {
    return db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `).all(userId, limit);
  }

  getUnreadCount(userId) {
    return db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND status = 'UNREAD'
    `).get(userId).count;
  }

  markAsRead(notificationId, userId) {
    db.prepare(`
      UPDATE notifications 
      SET status = 'READ', read_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `).run(notificationId, userId);
  }

  markAllAsRead(userId) {
    db.prepare(`
      UPDATE notifications 
      SET status = 'READ', read_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND status = 'UNREAD'
    `).run(userId);
  }
}

module.exports = new NotificationService();
