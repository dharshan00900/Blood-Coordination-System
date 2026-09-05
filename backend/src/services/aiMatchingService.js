const db = require('../db/database');
const compatibilityService = require('./compatibilityService');
const config = require('../config');

class AIMatchingService {
  /**
   * Layer 1: Rule-Based Safety & Eligibility Filter
   * Enforces configured ABO/Rh compatibility, availability, and donation intervals.
   */
  filterEligibleDonors(request) {
    const { blood_group_needed, hospital_district, hospital_location } = request;

    // 1. Get compatible blood groups from configuration table
    const compatibleGroups = compatibilityService.getCompatibleDonorGroups(blood_group_needed);

    if (compatibleGroups.length === 0) {
      return [];
    }

    // 2. Query all active registered donors who match compatible blood groups
    const placeholders = compatibleGroups.map(() => '?').join(',');
    const query = `
      SELECT 
        u.id as donor_id,
        u.name,
        u.email,
        u.phone,
        dp.blood_group,
        dp.location,
        dp.district,
        dp.state,
        dp.last_donation_date,
        dp.availability_status,
        dp.eligibility_status,
        dp.response_rate,
        dp.average_response_time,
        COALESCE(db_b.requests_received, 0) as requests_received,
        COALESCE(db_b.requests_responded, 0) as requests_responded,
        COALESCE(db_b.requests_accepted, 0) as requests_accepted,
        COALESCE(db_b.successful_donations, 0) as successful_donations
      FROM users u
      JOIN donor_profiles dp ON u.id = dp.user_id
      LEFT JOIN donor_behavior db_b ON u.id = db_b.donor_id
      WHERE u.role = 'donor'
        AND u.status = 'active'
        AND dp.availability_status = 'AVAILABLE'
        AND dp.consent_given = 1
        AND dp.blood_group IN (${placeholders})
    `;

    const candidates = db.prepare(query).all(...compatibleGroups);
    const now = new Date();

    // 3. Filter candidates through dynamic eligibility & 90-day waiting period
    const eligibleDonors = candidates.filter(donor => {
      if (donor.last_donation_date) {
        const lastDonation = new Date(donor.last_donation_date);
        const diffDays = Math.floor((now - lastDonation) / (1000 * 60 * 60 * 24));
        if (diffDays < config.DONATION_INTERVAL_DAYS) {
          // Update status in DB for audit trail
          db.prepare('UPDATE donor_profiles SET eligibility_status = ? WHERE user_id = ?')
            .run('NOT_CURRENTLY_ELIGIBLE', donor.donor_id);
          return false;
        }
      }
      return true;
    });

    return eligibleDonors;
  }

  /**
   * Calculate location proximity tier without GPS tracking
   * Tier 1: Same city/town
   * Tier 2: Same district / neighboring town
   * Tier 3: Same state
   * Tier 4: Other region
   */
  calculateLocationProximity(donorLocation, donorDistrict, hospitalLocation, hospitalDistrict) {
    const dLoc = (donorLocation || '').toLowerCase();
    const dDist = (donorDistrict || '').toLowerCase();
    const hLoc = (hospitalLocation || '').toLowerCase();
    const hDist = (hospitalDistrict || '').toLowerCase();

    if (dDist === hDist || dLoc.includes(hDist) || hLoc.includes(dDist)) {
      // Check sub-locality similarity
      const tokensD = dLoc.split(/[\s,]+/);
      const tokensH = hLoc.split(/[\s,]+/);
      const common = tokensD.filter(t => t.length > 3 && tokensH.includes(t));
      if (common.length > 0 || dLoc.includes('erode') && hLoc.includes('erode')) {
        return { tier: 1, score: 1.0, label: 'Immediate vicinity (~3 - 7 km)', approxKm: 5 };
      }
      return { tier: 1, score: 0.92, label: 'Same district area (~10 - 20 km)', approxKm: 15 };
    }

    // Known neighboring districts in Tamil Nadu
    const neighborsMap = {
      'erode': ['coimbatore', 'tirupur', 'salem', 'namakkal'],
      'coimbatore': ['erode', 'tirupur', 'nilgiris'],
      'salem': ['erode', 'namakkal', 'dharmapuri']
    };

    if (neighborsMap[hDist] && neighborsMap[hDist].includes(dDist)) {
      return { tier: 2, score: 0.75, label: `Neighboring district (${donorDistrict}, ~45 - 65 km)`, approxKm: 55 };
    }

    return { tier: 3, score: 0.50, label: `Regional (${donorDistrict}, ~100+ km)`, approxKm: 120 };
  }

  /**
   * Layer 2: AI / ML Priority Scoring
   * predictDonorPriority exposes an isolated interface ready to be backed
   * by an external ML service, Bayesian probability model, or neural ranker.
   */
  predictDonorPriority(features) {
    const {
      compatibilityMatch, // 1.0 for exact, 0.9 for cross-compatible
      proximityScore,     // 0.5 to 1.0
      responseRate,       // 0.0 to 1.0
      acceptanceRate,     // 0.0 to 1.0
      avgResponseTime,    // in minutes
      urgencyLevel,       // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL'
      hasHistoricalData   // boolean
    } = features;

    // Response speed scoring (sub-10m = 1.0, 10-20m = 0.8, >30m = 0.5)
    let speedScore = 0.5;
    if (avgResponseTime <= 8) speedScore = 1.0;
    else if (avgResponseTime <= 15) speedScore = 0.85;
    else if (avgResponseTime <= 30) speedScore = 0.70;

    // Urgency multiplier
    const urgencyWeights = {
      'CRITICAL': 1.15,
      'HIGH': 1.08,
      'MEDIUM': 1.0,
      'NORMAL': 0.95
    };
    const uWeight = urgencyWeights[urgencyLevel] || 1.0;

    let probability = 0;
    const reasons = [];

    if (!hasHistoricalData) {
      // Cold-start baseline heuristic model
      const baseScore = (compatibilityMatch * 0.40) + (proximityScore * 0.40) + (speedScore * 0.20);
      probability = Math.min(0.85, Math.max(0.50, baseScore * (uWeight * 0.95)));
      reasons.push('Baseline ranking model (New donor account)');
    } else {
      // Weighted calibrated logistic regression scoring
      // weights sum to 1.0
      const linear = (
        (compatibilityMatch * 0.25) +
        (proximityScore * 0.28) +
        (responseRate * 0.20) +
        (acceptanceRate * 0.15) +
        (speedScore * 0.12)
      ) * uWeight;

      // Sigmoid calibration mapping linear to probability
      // Center ~0.8 -> maps to 0.75 - 0.96
      const z = (linear - 0.5) * 5.0;
      probability = 1 / (1 + Math.exp(-z));
      probability = Math.min(0.98, Math.max(0.40, probability));
    }

    // Generate transparent AI score explanations
    if (compatibilityMatch >= 1.0) {
      reasons.push('✓ Exact ABO/Rh blood group match');
    } else {
      reasons.push('✓ Configured compatible alternative blood group');
    }

    if (proximityScore >= 0.9) {
      reasons.push('✓ High proximity in same local area');
    } else if (proximityScore >= 0.7) {
      reasons.push('✓ Accessible neighboring district proximity');
    }

    if (hasHistoricalData) {
      if (responseRate >= 0.85) {
        reasons.push(`✓ Proven response reliability (${Math.round(responseRate * 100)}% past responsiveness)`);
      }
      if (speedScore >= 0.8) {
        reasons.push(`✓ Rapid historical response (Avg. ${avgResponseTime.toFixed(1)} mins)`);
      }
    }

    if (urgencyLevel === 'CRITICAL' || urgencyLevel === 'HIGH') {
      reasons.push(`✓ Emergency urgency prioritization boost (${urgencyLevel})`);
    }

    return {
      matchScorePercentage: Math.round(probability * 100),
      rawProbability: Number(probability.toFixed(4)),
      scoreExplanations: reasons,
      modelType: hasHistoricalData ? 'AI Logistic Response Predictor' : 'Cold-Start Baseline Ranker'
    };
  }

  /**
   * Full pipeline: Filter -> Proximity Analysis -> AI Scoring -> Ranking
   */
  rankDonorsForRequest(request) {
    const candidates = this.filterEligibleDonors(request);

    const ranked = candidates.map(donor => {
      const isExactMatch = donor.blood_group === request.blood_group_needed;
      const proximity = this.calculateLocationProximity(
        donor.location,
        donor.district,
        request.hospital_location,
        request.hospital_district
      );

      const hasHistory = donor.requests_received > 0;
      const acceptanceRate = hasHistory && donor.requests_responded > 0
        ? donor.requests_accepted / donor.requests_responded
        : 0.8;

      const aiResult = this.predictDonorPriority({
        compatibilityMatch: isExactMatch ? 1.0 : 0.90,
        proximityScore: proximity.score,
        responseRate: donor.response_rate || 0.8,
        acceptanceRate: acceptanceRate,
        avgResponseTime: donor.average_response_time || 10,
        urgencyLevel: request.urgency,
        hasHistoricalData: hasHistory
      });

      return {
        donor_id: donor.donor_id,
        name: donor.name,
        email: donor.email,
        phone: donor.phone,
        blood_group: donor.blood_group,
        location: donor.location,
        district: donor.district,
        approximate_proximity: proximity.label,
        approx_km: proximity.approxKm,
        availability_status: donor.availability_status,
        eligibility_status: donor.eligibility_status,
        ai_match_score: aiResult.matchScorePercentage,
        raw_probability: aiResult.rawProbability,
        score_explanation: JSON.stringify(aiResult.scoreExplanations),
        score_reasons: aiResult.scoreExplanations,
        model_type: aiResult.modelType,
        is_exact_match: isExactMatch,
        response_rate: donor.response_rate,
        avg_response_time: donor.average_response_time
      };
    });

    // Sort descending by AI Match Score
    ranked.sort((a, b) => b.ai_match_score - a.ai_match_score);

    return ranked;
  }
}

module.exports = new AIMatchingService();
