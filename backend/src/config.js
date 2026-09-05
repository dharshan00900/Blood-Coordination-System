require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'lifelink_super_secure_emergency_token_secret_2026',
  DONATION_INTERVAL_DAYS: 90,
  ESCALATION_BATCH_SIZE: 3,
  MEDICAL_DISCLAIMER: "LifeLink is an emergency donor coordination and matching platform. Compatibility and eligibility shown by the system are based on registered information and configured rules. Final blood compatibility, donor eligibility, and transfusion decisions must be confirmed by qualified healthcare professionals or the relevant blood bank."
};
