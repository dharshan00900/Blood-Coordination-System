const db = require('../db/database');
const aiMatchingService = require('./aiMatchingService');
const notificationService = require('./notificationService');
const config = require('../config');

class EscalationService {
  /**
   * Start initial matching round (Round 1) for an approved request
   */
  initiateMatching(requestId) {
    const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
    if (!request) throw new Error('Blood request not found');

    const rankedDonors = aiMatchingService.rankDonorsForRequest(request);
    if (rankedDonors.length === 0) {
      db.prepare('UPDATE blood_requests SET status = ? WHERE id = ?').run('ACTIVE', requestId);
      return {
        round: 1,
        notifiedCount: 0,
        rankedDonors: [],
        message: 'No eligible compatible donors found at this moment.'
      };
    }

    // Determine batch for Round 1
    const batchSize = Math.max(config.ESCALATION_BATCH_SIZE, request.units_required * 2);
    const round1Donors = rankedDonors.slice(0, batchSize);

    // Save escalation round record
    db.prepare(`
      INSERT INTO escalation_rounds (request_id, round_number, notified_donors_count, status, cutoff_time)
      VALUES (?, 1, ?, 'ACTIVE', datetime('now', '+15 minutes'))
    `).run(requestId, round1Donors.length);

    // Update request state to MATCHING
    db.prepare(`
      UPDATE blood_requests 
      SET status = 'MATCHING', escalation_round = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(requestId);

    // Send notifications to Round 1 donors
    for (const donor of round1Donors) {
      // Check if already notified
      const existingNotif = db.prepare(
        'SELECT id FROM notifications WHERE user_id = ? AND request_id = ?'
      ).get(donor.donor_id, requestId);

      if (!existingNotif) {
        notificationService.notifyUser(donor.donor_id, {
          requestId: request.id,
          notificationType: 'EMERGENCY_REQUEST',
          title: `🚨 Emergency Blood Alert: ${request.blood_group_needed} Needed`,
          message: `${request.hospital_name} (${request.hospital_location}) urgently requires ${request.units_required} unit(s) of ${request.blood_group_needed} blood. Can you help?`,
          urgency: request.urgency
        });
      }
    }

    // Notify hospital that matching has commenced
    notificationService.notifyUser(request.requester_id, {
      requestId: request.id,
      notificationType: 'REQUEST_UPDATE',
      title: 'Donor Matching Initiated',
      message: `Round 1 escalation active: ${round1Donors.length} prioritized donors notified for ${request.reference_no}.`,
      urgency: 'NORMAL'
    });

    return {
      round: 1,
      notifiedCount: round1Donors.length,
      batchDonors: round1Donors,
      totalEligible: rankedDonors.length
    };
  }

  /**
   * Advance to the next escalation round (Round 2 or 3)
   */
  escalateRequest(requestId, manualTriggerBy = null) {
    const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
    if (!request) throw new Error('Blood request not found');

    const currentRound = request.escalation_round || 1;
    if (currentRound >= 3) {
      return { success: false, message: 'Request has reached maximum escalation round (Round 3).' };
    }

    const nextRound = currentRound + 1;
    const rankedDonors = aiMatchingService.rankDonorsForRequest(request);

    // Calculate donor slice for the next round
    const batchSize = Math.max(config.ESCALATION_BATCH_SIZE, request.units_required * 2);
    const startIndex = currentRound * batchSize;
    const nextBatch = rankedDonors.slice(startIndex, startIndex + batchSize);

    // Close previous round
    db.prepare(`
      UPDATE escalation_rounds 
      SET status = 'ESCALATED' 
      WHERE request_id = ? AND round_number = ?
    `).run(requestId, currentRound);

    // Insert new round
    db.prepare(`
      INSERT INTO escalation_rounds (request_id, round_number, notified_donors_count, status, cutoff_time)
      VALUES (?, ?, ?, 'ACTIVE', datetime('now', '+20 minutes'))
    `).run(requestId, nextRound, nextBatch.length);

    // Update request record
    db.prepare(`
      UPDATE blood_requests 
      SET escalation_round = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(nextRound, requestId);

    // Send notifications to the new tier
    for (const donor of nextBatch) {
      notificationService.notifyUser(donor.donor_id, {
        requestId: request.id,
        notificationType: 'EMERGENCY_REQUEST',
        title: `🚨 Escalation Round ${nextRound}: ${request.blood_group_needed} Blood Needed`,
        message: `${request.hospital_name} has expanded the donor search for ${request.blood_group_needed} blood (${request.urgency} urgency). Your assistance can save a life!`,
        urgency: request.urgency
      });
    }

    // Notify hospital
    notificationService.notifyUser(request.requester_id, {
      requestId: request.id,
      notificationType: 'REQUEST_UPDATE',
      title: `Escalated to Round ${nextRound}`,
      message: `Expanded matching pool: ${nextBatch.length} additional potential donors alerted for ${request.reference_no}.`,
      urgency: 'HIGH'
    });

    return {
      success: true,
      currentRound: nextRound,
      notifiedCount: nextBatch.length,
      nextBatch
    };
  }

  /**
   * Check if request has sufficient accepted responses
   */
  evaluateFulfillmentThreshold(requestId) {
    const request = db.prepare('SELECT * FROM blood_requests WHERE id = ?').get(requestId);
    if (!request) return;

    const acceptedCount = db.prepare(`
      SELECT COUNT(*) as count FROM donor_responses 
      WHERE request_id = ? AND response = 'ACCEPTED'
    `).get(requestId).count;

    if (acceptedCount >= request.units_required) {
      db.prepare(`
        UPDATE blood_requests 
        SET status = 'POTENTIAL_MATCHES', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status IN ('MATCHING', 'DONOR_RESPONSES')
      `).run(requestId);

      notificationService.notifyUser(request.requester_id, {
        requestId: request.id,
        notificationType: 'REQUEST_UPDATE',
        title: '🎯 Potential Matches Found!',
        message: `Great news: ${acceptedCount} donor(s) responded to help for ${request.reference_no}. Review potential matches now.`,
        urgency: 'HIGH'
      });
    } else if (acceptedCount > 0) {
      db.prepare(`
        UPDATE blood_requests 
        SET status = 'DONOR_RESPONSES', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status = 'MATCHING'
      `).run(requestId);
    }
  }
}

module.exports = new EscalationService();
