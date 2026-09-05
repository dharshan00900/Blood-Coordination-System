const db = require('../db/database');

class HospitalController {
  getHospitalProfile(req, res) {
    try {
      const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(req.user.id);
      const hospital = db.prepare('SELECT * FROM hospitals WHERE user_id = ?').get(req.user.id);
      return res.json({ success: true, user, hospital });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getHospitalStats(req, res) {
    try {
      const userId = req.user.id;
      const totalRequests = db.prepare('SELECT COUNT(*) as cnt FROM blood_requests WHERE requester_id = ?').get(userId).cnt;
      const activeRequests = db.prepare(`
        SELECT COUNT(*) as cnt FROM blood_requests 
        WHERE requester_id = ? AND status IN ('ACTIVE', 'MATCHING', 'DONOR_RESPONSES', 'POTENTIAL_MATCHES', 'SUBMITTED')
      `).get(userId).cnt;
      const fulfilledRequests = db.prepare('SELECT COUNT(*) as cnt FROM blood_requests WHERE requester_id = ? AND status = "FULFILLED"').get(userId).cnt;
      
      const totalResponses = db.prepare(`
        SELECT COUNT(*) as cnt FROM donor_responses dr
        JOIN blood_requests br ON dr.request_id = br.id
        WHERE br.requester_id = ?
      `).get(userId).cnt;

      const acceptedMatches = db.prepare(`
        SELECT COUNT(*) as cnt FROM donor_responses dr
        JOIN blood_requests br ON dr.request_id = br.id
        WHERE br.requester_id = ? AND dr.response = 'ACCEPTED'
      `).get(userId).cnt;

      return res.json({
        success: true,
        stats: {
          totalRequests,
          activeRequests,
          fulfilledRequests,
          totalResponses,
          potentialMatches: acceptedMatches,
          responseRate: totalResponses > 0 ? Math.round((acceptedMatches / totalResponses) * 100) : 100
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new HospitalController();
