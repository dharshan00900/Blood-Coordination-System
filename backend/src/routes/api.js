const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const donorController = require('../controllers/donorController');
const hospitalController = require('../controllers/hospitalController');
const requestController = require('../controllers/requestController');
const adminController = require('../controllers/adminController');
const notificationController = require('../controllers/notificationController');

const { authenticate, authorize } = require('../middleware/auth');
const config = require('../config');

// Health & System Info
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'LifeLink AI Emergency Blood Coordination Engine',
    version: '2.4.0',
    disclaimer: config.MEDICAL_DISCLAIMER
  });
});

// --- Auth Routes ---
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.get('/auth/me', authenticate, (req, res) => authController.me(req, res));
router.get('/auth/demo-accounts', (req, res) => authController.getDemoAccounts(req, res));

// --- Donor Routes (Protected: donor) ---
router.get('/donor/profile', authenticate, authorize('donor'), (req, res) => donorController.getProfile(req, res));
router.put('/donor/profile', authenticate, authorize('donor'), (req, res) => donorController.updateProfile(req, res));
router.put('/donor/availability', authenticate, authorize('donor'), (req, res) => donorController.toggleAvailability(req, res));
router.get('/donor/requests', authenticate, authorize('donor'), (req, res) => donorController.getMyRequests(req, res));
router.post('/donor/requests/:id/respond', authenticate, authorize('donor'), (req, res) => donorController.respondToRequest(req, res));
router.get('/donor/history', authenticate, authorize('donor'), (req, res) => donorController.getDonationHistory(req, res));

// --- Hospital Routes (Protected: hospital, admin) ---
router.get('/hospital/profile', authenticate, authorize('hospital', 'admin'), (req, res) => hospitalController.getHospitalProfile(req, res));
router.get('/hospital/stats', authenticate, authorize('hospital', 'admin'), (req, res) => hospitalController.getHospitalStats(req, res));

// --- Blood Requests Routes (Protected: hospital, admin, donor for viewing) ---
router.post('/requests', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.createRequest(req, res));
router.get('/requests', authenticate, (req, res) => requestController.getAllRequests(req, res));
router.get('/requests/:id', authenticate, (req, res) => requestController.getRequestById(req, res));
router.get('/requests/:id/matches', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.getRequestMatches(req, res));
router.post('/requests/:id/match', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.runMatching(req, res));
router.post('/requests/:id/escalate', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.escalateRound(req, res));
router.post('/requests/:id/verify-match', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.verifyDonorMatch(req, res));
router.post('/requests/:id/fulfill', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.fulfillRequest(req, res));
router.post('/requests/:id/cancel', authenticate, authorize('hospital', 'admin'), (req, res) => requestController.cancelRequest(req, res));

// --- Admin Routes (Protected: admin) ---
router.get('/admin/stats', authenticate, authorize('admin'), (req, res) => adminController.getStats(req, res));
router.get('/admin/users', authenticate, authorize('admin'), (req, res) => adminController.getAllUsers(req, res));
router.put('/admin/users/:id/status', authenticate, authorize('admin'), (req, res) => adminController.toggleUserStatus(req, res));
router.put('/admin/hospitals/:id/verify', authenticate, authorize('admin'), (req, res) => adminController.verifyHospital(req, res));
router.post('/admin/requests/:id/verify', authenticate, authorize('admin'), (req, res) => adminController.approveRequest(req, res));
router.post('/admin/requests/:id/reject', authenticate, authorize('admin'), (req, res) => adminController.rejectRequest(req, res));
router.get('/admin/analytics', authenticate, authorize('admin'), (req, res) => adminController.getAnalytics(req, res));
router.get('/admin/audit-logs', authenticate, authorize('admin'), (req, res) => adminController.getAuditLogs(req, res));
router.get('/admin/rules', authenticate, authorize('admin'), (req, res) => adminController.getCompatibilityRules(req, res));
router.put('/admin/rules/:id', authenticate, authorize('admin'), (req, res) => adminController.toggleCompatibilityRule(req, res));

// --- In-App Notifications & SSE ---
router.get('/notifications', authenticate, (req, res) => notificationController.getMyNotifications(req, res));
router.put('/notifications/:id/read', authenticate, (req, res) => notificationController.markRead(req, res));
router.put('/notifications/read-all', authenticate, (req, res) => notificationController.markAllRead(req, res));
router.get('/notifications/stream', (req, res) => notificationController.streamSSE(req, res));

module.exports = router;
