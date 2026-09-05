const db = require('../db/database');
const config = require('../config');
const aiMatchingService = require('../services/aiMatchingService');
const escalationService = require('../services/escalationService');
const notificationService = require('../services/notificationService');
const { logAudit } = require('../middleware/auth');

class RequestController {
  createRequest(req, res) {
    try {
      const {
        bloodGroupNeeded,
        hospitalName,
        hospitalLocation,
        hospitalDistrict,
        unitsRequired,
        urgency = 'HIGH',
        requiredBy,
        notes
      } = req.body;

      if (!bloodGroupNeeded || !hospitalName || !hospitalLocation || !unitsRequired || !urgency) {
        return res.status(400).json({ success: false, message: 'All required fields must be supplied.' });
      }

      const units = parseInt(unitsRequired);
      if (isNaN(units) || units <= 0) {
        return res.status(400).json({ success: false, message: 'Units required must be greater than zero.' });
      }

      const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      if (!validGroups.includes(bloodGroupNeeded)) {
        return res.status(400).json({ success: false, message: 'Invalid blood group specified.' });
      }

      const validUrgencies = ['CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL'];
      if (!validUrgencies.includes(urgency)) {
        return res.status(400).json({ success: false, message: 'Invalid urgency specified.' });
      }

      // Generate Reference Number
      const year = new Date().getFullYear();
      const count = db.prepare('SELECT COUNT(*) as count FROM blood_requests').get().count + 1;
      const refNo = `LL-REQ-${year}-${String(count).padStart(3, '0')}`;

      const district = hospitalDistrict || hospitalLocation.split(',')[0].trim();

      // Check if hospital is verified
      const hospitalRecord = db.prepare('SELECT * FROM hospitals WHERE user_id = ?').get(req.user.id);
      
      // If hospital is verified or user is admin, request goes to ACTIVE directly, or SUBMITTED for admin review
      const initialStatus = (hospitalRecord && hospitalRecord.verification_status === 'VERIFIED') || req.user.role === 'admin'
        ? 'ACTIVE'
        : 'SUBMITTED';

      const insert = db.prepare(`
        INSERT INTO blood_requests (
          reference_no, requester_id, hospital_name, hospital_location,
          hospital_district, blood_group_needed, units_required, urgency,
          status, escalation_round, required_by, notes, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now', '+24 hours'))
      `);

      const info = insert.run(
        refNo,
        req.user.id,
        hospitalName,
        hospitalLocation,
        district,
        bloodGroupNeeded,
        units,
        urgency,
        initialStatus,
        requiredBy || null,
        notes || null
      );

      const requestId = info.lastInsertRowid;
      logAudit(req.user.id, 'REQUEST_CREATED', 'blood_requests', requestId, { refNo, bloodGroupNeeded, urgency }, req);

      // If already active, trigger Round 1 matching immediately!
      let matchSummary = null;
      if (initialStatus === 'ACTIVE') {
        matchSummary = escalationService.initiateMatching(requestId);
      } else {
        // Notify Admins for verification
        notificationService.broadcastToRole('admin', 'SYSTEM', {
          title: 'New Emergency Request Awaiting Approval',
          message: `Request ${refNo} from ${hospitalName} needs admin authorization.`
        });
      }

      const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);

      return res.status(201).json({
        success: true,
        message: initialStatus === 'ACTIVE' 
          ? `Emergency request ${refNo} published and donor matching initiated.` 
          : `Request ${refNo} submitted for administrative verification.`,
        request,
        matchSummary
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getAllRequests(req, res) {
    try {
      const { status, urgency, bloodGroup, requesterOnly } = req.query;

      let sql = 'SELECT * FROM blood_requests WHERE 1=1';
      const params = [];

      if (requesterOnly === 'true' && req.user) {
        sql += ' AND requester_id = ?';
        params.push(req.user.id);
      }

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (urgency) {
        sql += ' AND urgency = ?';
        params.push(urgency);
      }

      if (bloodGroup) {
        sql += ' AND blood_group_needed = ?';
        params.push(bloodGroup);
      }

      sql += ' ORDER BY created_at DESC';

      const requests = db.prepare(sql).all(...params);

      // Attach response counts to each request
      const enriched = requests.map(r => {
        const responseStats = db.prepare(`
          SELECT 
            COUNT(*) as total_responses,
            SUM(CASE WHEN response = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_count,
            SUM(CASE WHEN response = 'DECLINED' THEN 1 ELSE 0 END) as declined_count,
            SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_count
          FROM donor_responses 
          WHERE request_id = ?
        `).get(r.id);

        return {
          ...r,
          stats: {
            total_responses: responseStats.total_responses || 0,
            accepted_count: responseStats.accepted_count || 0,
            declined_count: responseStats.declined_count || 0,
            verified_count: responseStats.verified_count || 0
          }
        };
      });

      return res.json({ success: true, requests: enriched });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getRequestById(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      const escalationHistory = db.prepare(`
        SELECT * FROM escalation_rounds WHERE request_id = ? ORDER BY round_number ASC
      `).all(requestId);

      const responses = db.prepare(`
        SELECT 
          dr.id as response_id,
          dr.request_id,
          dr.response,
          dr.response_time_seconds,
          dr.compatibility_status,
          dr.ai_match_score,
          dr.score_explanation,
          dr.status,
          dr.created_at,
          u.name as donor_name,
          u.phone as donor_phone,
          dp.blood_group as donor_blood_group,
          dp.location as donor_location,
          dp.district as donor_district
        FROM donor_responses dr
        JOIN users u ON dr.donor_id = u.id
        JOIN donor_profiles dp ON u.id = dp.user_id
        WHERE dr.request_id = ?
        ORDER BY dr.ai_match_score DESC
      `).all(requestId);

      return res.json({
        success: true,
        request,
        escalationHistory,
        responses: responses.map(r => ({
          ...r,
          score_reasons: r.score_explanation ? JSON.parse(r.score_explanation) : []
        })),
        disclaimer: config.MEDICAL_DISCLAIMER
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getRequestMatches(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      // 1. Get already responded donors
      const responses = db.prepare(`
        SELECT 
          dr.id as response_id,
          dr.donor_id,
          dr.response,
          dr.response_time_seconds,
          dr.compatibility_status,
          dr.ai_match_score,
          dr.score_explanation,
          dr.status,
          dr.created_at as responded_at,
          u.name as donor_name,
          u.phone as donor_phone,
          dp.blood_group as donor_blood_group,
          dp.location as donor_location,
          dp.district as donor_district
        FROM donor_responses dr
        JOIN users u ON dr.donor_id = u.id
        JOIN donor_profiles dp ON u.id = dp.user_id
        WHERE dr.request_id = ?
        ORDER BY dr.ai_match_score DESC
      `).all(requestId);

      // 2. Get ranked pool of all eligible donors from AI matching service
      const rankedEligible = aiMatchingService.rankDonorsForRequest(request);

      return res.json({
        success: true,
        request,
        responses: responses.map(r => ({
          ...r,
          score_reasons: r.score_explanation ? JSON.parse(r.score_explanation) : []
        })),
        potentialDonorsPool: rankedEligible.map(d => ({
          donor_id: d.donor_id,
          name: d.name,
          blood_group: d.blood_group,
          approximate_proximity: d.approximate_proximity,
          ai_match_score: d.ai_match_score,
          score_reasons: d.score_reasons,
          model_type: d.model_type,
          availability: d.availability_status
        })),
        disclaimer: config.MEDICAL_DISCLAIMER
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  runMatching(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const result = escalationService.initiateMatching(requestId);
      logAudit(req.user.id, 'TRIGGER_MATCHING', 'blood_requests', requestId, { round: result.round }, req);
      return res.json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  escalateRound(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const result = escalationService.escalateRequest(requestId, req.user.id);
      logAudit(req.user.id, 'ESCALATE_REQUEST', 'blood_requests', requestId, { round: result.currentRound }, req);
      return res.json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  verifyDonorMatch(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const { responseId, notes } = req.body;

      db.prepare(`
        UPDATE donor_responses 
        SET status = 'VERIFIED' 
        WHERE id = ? AND request_id = ?
      `).run(responseId, requestId);

      const response = db.prepare('SELECT * FROM donor_responses WHERE id = ?').get(responseId);

      // Notify the donor that hospital verified their match
      notificationService.notifyUser(response.donor_id, {
        requestId,
        notificationType: 'STATUS_CHANGE',
        title: '✅ Match Medically Confirmed!',
        message: 'The hospital has confirmed your donor match. Thank you for your vital contribution.',
        urgency: 'HIGH'
      });

      logAudit(req.user.id, 'VERIFY_DONOR_MATCH', 'donor_responses', responseId, { requestId, notes }, req);

      return res.json({ success: true, message: 'Donor match verified by hospital.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  fulfillRequest(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const { verifiedDonorIds = [], notes } = req.body;

      db.prepare(`
        UPDATE blood_requests 
        SET status = 'FULFILLED', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(requestId);

      // Record successful donations
      const insertDonation = db.prepare(`
        INSERT INTO donations (donor_id, request_id, verification_status, notes)
        VALUES (?, ?, 'VERIFIED', ?)
      `);

      const updateBehavior = db.prepare(`
        UPDATE donor_behavior 
        SET successful_donations = successful_donations + 1 
        WHERE donor_id = ?
      `);

      const updateDonorDate = db.prepare(`
        UPDATE donor_profiles 
        SET last_donation_date = CURRENT_DATE, eligibility_status = 'NOT_CURRENTLY_ELIGIBLE' 
        WHERE user_id = ?
      `);

      for (const donorId of verifiedDonorIds) {
        insertDonation.run(donorId, requestId, notes || 'Emergency transfusion successfully completed.');
        updateBehavior.run(donorId);
        updateDonorDate.run(donorId);

        notificationService.notifyUser(donorId, {
          requestId,
          notificationType: 'STATUS_CHANGE',
          title: '🎉 LifeLink Transfusion Fulfilled!',
          message: 'Your blood donation was successfully completed and recorded. You saved a life today!',
          urgency: 'NORMAL'
        });
      }

      logAudit(req.user.id, 'FULFILL_REQUEST', 'blood_requests', requestId, { verifiedDonors: verifiedDonorIds }, req);

      return res.json({
        success: true,
        message: 'Emergency request marked as FULFILLED. Successful donations recorded.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  cancelRequest(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      db.prepare(`
        UPDATE blood_requests 
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(requestId);

      logAudit(req.user.id, 'CANCEL_REQUEST', 'blood_requests', requestId, null, req);

      return res.json({ success: true, message: 'Request cancelled successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new RequestController();
