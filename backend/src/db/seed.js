const bcrypt = require('bcryptjs');
const db = require('./database');

function seedDatabase() {
  console.log('Seeding LifeLink database with verified demo data...');

  // Clear existing data in correct FK order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM donations;
    DELETE FROM donor_responses;
    DELETE FROM notifications;
    DELETE FROM escalation_rounds;
    DELETE FROM blood_requests;
    DELETE FROM donor_behavior;
    DELETE FROM donor_profiles;
    DELETE FROM hospitals;
    DELETE FROM users;
  `);

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const hospitalHash = bcrypt.hashSync('Hospital@123', salt);
  const donorHash = bcrypt.hashSync('Donor@123', salt);

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    [1, 'System Administrator', 'admin@lifelink.org', '+91-9443100001', adminHash, 'admin', 'active'],
    [2, 'Lotus Emergency Hospital', 'lotus.erode@hospital.org', '+91-9443100002', hospitalHash, 'hospital', 'active'],
    [3, 'KMCH Kovai Medical Center', 'kmch.cbe@hospital.org', '+91-9443100003', hospitalHash, 'hospital', 'active'],
    [4, 'Rajesh Kumar (Demo Donor)', 'rajesh.erode@gmail.com', '+91-9842100011', donorHash, 'donor', 'active'],
    [5, 'Priya Raman (Demo Donor)', 'priya.erode@gmail.com', '+91-9842100012', donorHash, 'donor', 'active'],
    [6, 'Karthik Shanmugam (Demo Donor)', 'karthik.perundurai@gmail.com', '+91-9842100013', donorHash, 'donor', 'active'],
    [7, 'Ananya Venkataraman (Demo Donor)', 'ananya.cbe@gmail.com', '+91-9842100014', donorHash, 'donor', 'active'],
    [8, 'Suresh Muthusamy (Demo Donor)', 'suresh.salem@gmail.com', '+91-9842100015', donorHash, 'donor', 'active'],
    [9, 'Deepa Ravichandran (Demo Donor)', 'deepa.erode@gmail.com', '+91-9842100016', donorHash, 'donor', 'active'],
    [10, 'Vijay Anand (Demo Donor)', 'vijay.chennai@gmail.com', '+91-9842100017', donorHash, 'donor', 'active'],
    [11, 'Manoj Thangavel (Unavailable Donor)', 'manoj.erode@gmail.com', '+91-9842100018', donorHash, 'donor', 'active'],
    [12, 'Kavitha Natesan (Ineligible Donor)', 'kavitha.erode@gmail.com', '+91-9842100019', donorHash, 'donor', 'active'],
  ];

  for (const u of users) {
    insertUser.run(...u);
  }

  // 2. Insert Hospital Profiles
  const insertHospital = db.prepare(`
    INSERT INTO hospitals (user_id, hospital_name, location, district, registration_no, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertHospital.run(2, 'Lotus Emergency Hospital', 'Poondurai Road, Erode', 'Erode', 'TN-MED-ERD-4412', 'VERIFIED');
  insertHospital.run(3, 'KMCH Kovai Medical Center', 'Avinashi Road, Coimbatore', 'Coimbatore', 'TN-MED-CBE-9921', 'VERIFIED');

  // 3. Insert Donor Profiles & Behavior
  const insertDonorProfile = db.prepare(`
    INSERT INTO donor_profiles (
      user_id, blood_group, location, district, state,
      last_donation_date, availability_status, eligibility_status,
      response_rate, average_response_time, consent_given
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertBehavior = db.prepare(`
    INSERT INTO donor_behavior (
      donor_id, requests_received, requests_responded, requests_accepted,
      average_response_time, successful_donations
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const donorProfiles = [
    // Rajesh: O+, Erode, highly responsive, available, last donated 120 days ago (ELIGIBLE)
    [4, 'O+', 'Periyar Nagar, Erode', 'Erode', 'Tamil Nadu', '2026-05-01', 'AVAILABLE', 'ELIGIBLE', 0.95, 6.2],
    // Priya: O+, Erode, active responder, available, last donated 105 days ago (ELIGIBLE)
    [5, 'O+', 'Thindal, Erode', 'Erode', 'Tamil Nadu', '2026-05-15', 'AVAILABLE', 'ELIGIBLE', 0.90, 8.5],
    // Karthik: O+, Perundurai (near Erode), available, last donated 180 days ago (ELIGIBLE)
    [6, 'O+', 'SIPCOT, Perundurai', 'Erode', 'Tamil Nadu', '2026-03-01', 'AVAILABLE', 'ELIGIBLE', 0.85, 12.0],
    // Ananya: O- (Universal donor), Coimbatore, available, last donated 150 days ago (ELIGIBLE)
    [7, 'O-', 'RS Puram, Coimbatore', 'Coimbatore', 'Tamil Nadu', '2026-04-05', 'AVAILABLE', 'ELIGIBLE', 0.92, 7.0],
    // Suresh: A+, Salem, available, last donated 200 days ago
    [8, 'A+', 'Fairlands, Salem', 'Salem', 'Tamil Nadu', '2026-02-10', 'AVAILABLE', 'ELIGIBLE', 0.80, 15.0],
    // Deepa: B+, Erode, available, last donated 130 days ago
    [9, 'B+', 'Surampatti, Erode', 'Erode', 'Tamil Nadu', '2026-04-20', 'AVAILABLE', 'ELIGIBLE', 0.88, 9.4],
    // Vijay: AB+, Chennai, available
    [10, 'AB+', 'Adyar, Chennai', 'Chennai', 'Tamil Nadu', '2026-01-15', 'AVAILABLE', 'ELIGIBLE', 0.75, 20.0],
    // Manoj: O+, Erode, UNAVAILABLE
    [11, 'O+', 'Collectorate, Erode', 'Erode', 'Tamil Nadu', '2026-05-02', 'UNAVAILABLE', 'ELIGIBLE', 0.82, 11.0],
    // Kavitha: O+, Erode, NOT_CURRENTLY_ELIGIBLE (donated 25 days ago < 90 days required)
    [12, 'O+', 'Bhavani Road, Erode', 'Erode', 'Tamil Nadu', '2026-08-10', 'AVAILABLE', 'NOT_CURRENTLY_ELIGIBLE', 0.90, 8.0],
  ];

  for (const p of donorProfiles) {
    insertDonorProfile.run(...p);
  }

  const behaviors = [
    [4, 18, 17, 16, 6.2, 5],
    [5, 12, 11, 10, 8.5, 3],
    [6, 8, 7, 6, 12.0, 2],
    [7, 15, 14, 13, 7.0, 4],
    [8, 10, 8, 7, 15.0, 2],
    [9, 9, 8, 7, 9.4, 2],
    [10, 5, 4, 3, 20.0, 1],
    [11, 6, 5, 4, 11.0, 1],
    [12, 10, 9, 8, 8.0, 3],
  ];

  for (const b of behaviors) {
    insertBehavior.run(...b);
  }

  // 4. Insert Past Donations for donor history
  const insertDonation = db.prepare(`
    INSERT INTO donations (donor_id, request_id, donated_at, verification_status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  // 5. Insert Sample Blood Requests
  const insertRequest = db.prepare(`
    INSERT INTO blood_requests (
      id, reference_no, requester_id, hospital_name, hospital_location,
      hospital_district, blood_group_needed, units_required, urgency,
      status, escalation_round, required_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+6 hours'), ?, datetime('now', '-2 hours'))
  `);

  // Request 1: Active Critical emergency in Erode for O+ blood
  insertRequest.run(
    1,
    'LL-REQ-2026-001',
    2,
    'Lotus Emergency Hospital',
    'Poondurai Road, Erode',
    'Erode',
    'O+',
    2,
    'CRITICAL',
    'ACTIVE',
    1,
    'Emergency trauma ICU case. Patient requires urgent transfusion.'
  );

  // Request 2: Fulfilled past request in Coimbatore
  insertRequest.run(
    2,
    'LL-REQ-2026-002',
    3,
    'KMCH Kovai Medical Center',
    'Avinashi Road, Coimbatore',
    'Coimbatore',
    'O-',
    1,
    'HIGH',
    'FULFILLED',
    1,
    'Scheduled vascular surgery. Successfully fulfilled.'
  );

  // Record past donation for Request 2
  insertDonation.run(7, 2, '2026-08-25 14:30:00', 'VERIFIED', 'Ananya Venkataraman provided 1 unit O- blood');

  // Insert escalation round for Request 1
  db.prepare(`
    INSERT INTO escalation_rounds (request_id, round_number, notified_donors_count, status, started_at)
    VALUES (1, 1, 3, 'ACTIVE', datetime('now', '-2 hours'))
  `).run();

  // Notifications for seeded active request
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, request_id, notification_type, title, message, urgency, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hour'))
  `);

  insertNotif.run(
    4,
    1,
    'EMERGENCY_REQUEST',
    '🚨 Critical O+ Blood Needed at Lotus Hospital, Erode',
    'Urgent request for 2 units of O+ blood at Lotus Emergency Hospital, Erode. Patient in ICU.',
    'CRITICAL',
    'UNREAD'
  );

  insertNotif.run(
    5,
    1,
    'EMERGENCY_REQUEST',
    '🚨 Critical O+ Blood Needed at Lotus Hospital, Erode',
    'Urgent request for 2 units of O+ blood at Lotus Emergency Hospital, Erode. Patient in ICU.',
    'CRITICAL',
    'UNREAD'
  );

  // Audit Log
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
    VALUES (1, 'DATABASE_SEED', 'SYSTEM', 0, 'Demo dataset seeded with verified accounts and records.')
  `).run();

  console.log('Database seeded successfully.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
