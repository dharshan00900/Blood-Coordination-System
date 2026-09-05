const db = require('../db/database');
const config = require('../config');
const aiMatchingService = require('../services/aiMatchingService');
const escalationService = require('../services/escalationService');
const notificationService = require('../services/notificationService');
const { logAudit } = require('../middleware/auth');

class DonorController {
  getProfile(req, res) {
    try {
      const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
      const profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.user.id);
      const behavior = db.prepare('SELECT * FROM donor_behavior WHERE donor_id = ?').get(req.user.id);
      const donations = db.prepare(`
        SELECT d.*, br.blood_group_needed, br.hospital_name, br.hospital_location 
        FROM donations d 
        JOIN blood_requests br ON d.request_id = br.id 
        WHERE d.donor_id = ? 
        ORDER BY d.donated_at DESC
      `).all(req.user.id);

      // Calculate days until eligible
      let daysUntilEligible = 0;
      if (profile && profile.last_donation_date) {
        const lastDate = new Date(profile.last_donation_date);
        const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays < config.DONATION_INTERVAL_DAYS) {
          daysUntilEligible = config.DONATION_INTERVAL_DAYS - diffDays;
        }
      }

      return res.json({
        success: true,
        user,
        profile,
        behavior: behavior || {
          requests_received: 0,
          requests_responded: 0,
          requests_accepted: 0,
          average_response_time: 10.0,
          successful_donations: 0
        },
        donations,
        daysUntilEligible,
        disclaimer: config.MEDICAL_DISCLAIMER
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  updateProfile(req, res) {
    try {
      const { name, phone, location, district, lastDonationDate } = req.body;
      const userId = req.user.id;

      if (name || phone) {
        db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
          .run(name || null, phone || null, userId);
      }

      // Re-evaluate eligibility if lastDonationDate provided
      let eligibility = 'ELIGIBLE';
      if (lastDonationDate) {
        const diffDays = Math.floor((new Date() - new Date(lastDonationDate)) / (1000 * 60 * 60 * 24));
        if (diffDays < config.DONATION_INTERVAL_DAYS) {
          eligibility = 'NOT_CURRENTLY_ELIGIBLE';
        }
      }

      db.prepare(`
        UPDATE donor_profiles 
        SET location = COALESCE(?, location),
            district = COALESCE(?, district),
            last_donation_date = COALESCE(?, last_donation_date),
            eligibility_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(location || null, district || null, lastDonationDate || null, eligibility, userId);

      logAudit(userId, 'PROFILE_UPDATE', 'donor_profiles', userId, { location, district }, req);

      return res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  toggleAvailability(req, res) {
    try {
      const userId = req.user.id;
      const profile = db.prepare('SELECT availability_status FROM donor_profiles WHERE user_id = ?').get(userId);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Donor profile not found' });
      }

      const newStatus = profile.availability_status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
      db.prepare(`
        UPDATE donor_profiles 
        SET availability_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `).run(newStatus, userId);

      logAudit(userId, 'AVAILABILITY_TOGGLE', 'donor_profiles', userId, { newStatus }, req);

      return res.json({
        success: true,
        availabilityStatus: newStatus,
        message: `Status updated to ${newStatus}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getMyRequests(req, res) {
    try {
      const userId = req.user.id;

      // Find requests where this donor has received a notification or responded
      const requests = db.prepare(`
        SELECT 
          br.id as request_id,
          br.reference_no,
          br.hospital_name,
          br.hospital_location,
          br.hospital_district,
          br.blood_group_needed,
          br.units_required,
          br.urgency,
          br.status as request_status,
          br.escalation_round,
          br.required_by,
          br.notes,
          br.created_at,
          dr.response as donor_response,
          dr.status as response_status,
          dr.ai_match_score,
          dr.score_explanation,
          n.status as notif_status,
          n.sent_at as notified_at
        FROM blood_requests br
        LEFT JOIN notifications n ON br.id = n.request_id AND n.user_id = ?
        LEFT JOIN donor_responses dr ON br.id = dr.request_id AND dr.donor_id = ?
        WHERE (n.user_id IS NOT NULL OR dr.donor_id IS NOT NULL)
        ORDER BY br.created_at DESC
      `).all(userId, userId);

      return res.json({
        success: true,
        requests: requests.map(r => ({
          ...r,
          score_reasons: r.score_explanation ? JSON.parse(r.score_explanation) : []
        }))
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  respondToRequest(req, res) {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      const { response } = req.body; // 'ACCEPTED' | 'DECLINED'

      if (!['ACCEPTED', 'DECLINED'].includes(response)) {
        return res.status(400).json({ success: false, message: 'Response must be ACCEPTED or DECLINED.' });
      }

      const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
      if (!request) {
        return res.status(404).json({ success: false, message: 'Emergency request not found.' });
      }

      if (['FULFILLED', 'CLOSED', 'CANCELLED', 'EXPIRED'].includes(request.status)) {
        return res.status(400).json({ success: false, message: `This request is already ${request.status.toLowerCase()}.` });
      }

      // Check if already responded
      const existingResponse = db.prepare(`
        SELECT id, response FROM donor_responses WHERE request_id = ? AND donor_id = ?
      `).get(requestId, userId);

      if (existingResponse) {
        return res.status(400).json({ success: false, message: `You have already responded: ${existingResponse.response}` });
      }

      const donorProfile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(userId);
      const donorUser = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(userId);

      // Calculate response latency (seconds from request creation)
      const reqTime = new Date(request.created_at).getTime();
      const nowTime = Date.now();
      const responseTimeSeconds = Math.max(15, Math.round((nowTime - reqTime) / 1000));

      // Calculate AI match score
      const isExactMatch = donorProfile.blood_group === request.blood_group_needed;
      const proximity = aiMatchingService.calculateLocationProximity(
        donorProfile.location,
        donorProfile.district,
        request.hospital_location,
        request.hospital_district
      );

      const aiScore = aiMatchingService.predictDonorPriority({
        compatibilityMatch: isExactMatch ? 1.0 : 0.90,
        proximityScore: proximity.score,
        responseRate: donorProfile.response_rate || 0.85,
        acceptanceRate: 0.9,
        avgResponseTime: Math.min(30, responseTimeSeconds / 60),
        urgencyLevel: request.urgency,
        hasHistoricalData: true
      });

      const responseStatus = response === 'ACCEPTED' ? 'POTENTIAL_MATCH' : 'DECLINED';

      // Insert response into DB
      db.prepare(`
        INSERT INTO donor_responses (
          request_id, donor_id, response, response_time_seconds,
          compatibility_status, ai_match_score, score_explanation, status
        ) VALUES (?, ?, ?, ?, 'POTENTIALLY_COMPATIBLE', ?, ?, ?)
      `).run(
        requestId,
        userId,
        response,
        responseTimeSeconds,
        aiScore.matchScorePercentage,
        JSON.stringify(aiScore.scoreExplanations),
        responseStatus
      );

      // Update donor behavior stats
      db.prepare(`
        UPDATE donor_behavior 
        SET requests_responded = requests_responded + 1,
            requests_accepted = requests_accepted + (CASE WHEN ? = 'ACCEPTED' THEN 1 ELSE 0 END),
            average_response_time = (average_response_time + ?) / 2.0
        WHERE donor_id = ?
      `).run(response, Math.round(responseTimeSeconds / 60), userId);

      // Mark notification as read
      db.prepare(`
        UPDATE notifications 
        SET status = 'READ', read_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND request_id = ?
      `).run(userId, requestId);

      // If accepted, check escalation fulfillment threshold
      if (response === 'ACCEPTED') {
        escalationService.evaluateFulfillmentThreshold(requestId);

        // Notify Hospital in real-time
        notificationService.notifyUser(request.requester_id, {
          requestId: request.id,
          notificationType: 'REQUEST_UPDATE',
          title: `🩸 Donor Responded: "I Can Help"`,
          message: `${donorUser.name} (${donorProfile.blood_group}, ${donorProfile.district}) responded to help for ${request.reference_no}! AI Priority: ${aiScore.matchScorePercentage}%.`,
          urgency: 'HIGH'
        });
      }

      logAudit(userId, 'DONOR_RESPONDED', 'donor_responses', requestId, { response, aiScore: aiScore.matchScorePercentage }, req);

      return res.json({
        success: true,
        response,
        status: responseStatus,
        statusLabel: response === 'ACCEPTED' ? 'Potential Match (Pending Medical Verification)' : 'Declined',
        aiMatchScore: aiScore.matchScorePercentage,
        scoreExplanations: aiScore.scoreExplanations,
        disclaimer: config.MEDICAL_DISCLAIMER,
        message: response === 'ACCEPTED' 
          ? 'Your response has been submitted for compatibility and eligibility verification. Thank you for your willingness to help save a life!'
          : 'Thank you for updating your response.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getDonationHistory(req, res) {
    try {
      const donations = db.prepare(`
        SELECT d.*, br.reference_no, br.hospital_name, br.hospital_location, br.blood_group_needed
        FROM donations d
        JOIN blood_requests br ON d.request_id = br.id
        WHERE d.donor_id = ?
        ORDER BY d.donated_at DESC
      `).all(req.user.id);

      return res.json({ success: true, donations });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new DonorController();
