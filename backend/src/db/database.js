const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'lifelink.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('donor', 'hospital', 'admin')) NOT NULL,
      status TEXT CHECK(status IN ('active', 'blocked', 'pending')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS donor_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      blood_group TEXT CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
      location TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'Tamil Nadu',
      last_donation_date DATE,
      availability_status TEXT CHECK(availability_status IN ('AVAILABLE', 'UNAVAILABLE')) DEFAULT 'AVAILABLE',
      eligibility_status TEXT CHECK(eligibility_status IN ('ELIGIBLE', 'NOT_CURRENTLY_ELIGIBLE', 'PENDING_VERIFICATION')) DEFAULT 'ELIGIBLE',
      response_rate REAL DEFAULT 1.0,
      average_response_time REAL DEFAULT 8.5,
      consent_given INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      hospital_name TEXT NOT NULL,
      location TEXT NOT NULL,
      district TEXT NOT NULL,
      registration_no TEXT NOT NULL,
      verification_status TEXT CHECK(verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blood_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      requester_id INTEGER NOT NULL,
      hospital_name TEXT NOT NULL,
      hospital_location TEXT NOT NULL,
      hospital_district TEXT NOT NULL,
      blood_group_needed TEXT CHECK(blood_group_needed IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
      units_required INTEGER NOT NULL CHECK(units_required > 0),
      urgency TEXT CHECK(urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL')) NOT NULL,
      status TEXT CHECK(status IN (
        'DRAFT', 'SUBMITTED', 'VERIFICATION', 'ACTIVE', 'MATCHING',
        'DONOR_RESPONSES', 'POTENTIAL_MATCHES', 'FULFILLED', 'CLOSED',
        'REJECTED', 'CANCELLED', 'EXPIRED'
      )) DEFAULT 'SUBMITTED',
      escalation_round INTEGER DEFAULT 1,
      required_by DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS compatibility_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_group TEXT NOT NULL,
      recipient_group TEXT NOT NULL,
      component_type TEXT DEFAULT 'WHOLE_BLOOD',
      enabled INTEGER DEFAULT 1,
      notes TEXT,
      UNIQUE(donor_group, recipient_group, component_type)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      request_id INTEGER,
      notification_type TEXT CHECK(notification_type IN ('EMERGENCY_REQUEST', 'REQUEST_UPDATE', 'STATUS_CHANGE', 'SYSTEM')) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      urgency TEXT DEFAULT 'NORMAL',
      status TEXT CHECK(status IN ('UNREAD', 'READ')) DEFAULT 'UNREAD',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS donor_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      response TEXT CHECK(response IN ('ACCEPTED', 'DECLINED', 'EXPIRED')) NOT NULL,
      response_time_seconds INTEGER DEFAULT 0,
      compatibility_status TEXT DEFAULT 'POTENTIALLY_COMPATIBLE',
      ai_match_score REAL NOT NULL,
      score_explanation TEXT,
      status TEXT CHECK(status IN ('SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'POTENTIAL_MATCH', 'VERIFIED', 'REJECTED')) DEFAULT 'SENT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(request_id, donor_id)
    );

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL,
      request_id INTEGER NOT NULL,
      donated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verification_status TEXT CHECK(verification_status IN ('VERIFIED', 'PENDING')) DEFAULT 'VERIFIED',
      notes TEXT,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS donor_behavior (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER UNIQUE NOT NULL,
      requests_received INTEGER DEFAULT 0,
      requests_responded INTEGER DEFAULT 0,
      requests_accepted INTEGER DEFAULT 0,
      average_response_time REAL DEFAULT 10.0,
      successful_donations INTEGER DEFAULT 0,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS escalation_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      notified_donors_count INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'ESCALATED')) DEFAULT 'ACTIVE',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cutoff_time DATETIME,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requests_status ON blood_requests(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_donor_responses_req ON donor_responses(request_id);
    CREATE INDEX IF NOT EXISTS idx_donor_profiles_blood ON donor_profiles(blood_group, availability_status);
  `);

  // Seed default compatibility matrix if empty
  const count = db.prepare('SELECT COUNT(*) as cnt FROM compatibility_rules').get().cnt;
  if (count === 0) {
    const defaultRules = [
      // O- is universal RBC/Whole blood donor
      ['O-', 'O-', 1, 'Exact match'],
      ['O-', 'O+', 1, 'Universal donor to O+'],
      ['O-', 'A-', 1, 'Universal donor to A-'],
      ['O-', 'A+', 1, 'Universal donor to A+'],
      ['O-', 'B-', 1, 'Universal donor to B-'],
      ['O-', 'B+', 1, 'Universal donor to B+'],
      ['O-', 'AB-', 1, 'Universal donor to AB-'],
      ['O-', 'AB+', 1, 'Universal donor to AB+'],
      // O+
      ['O+', 'O+', 1, 'Exact match'],
      ['O+', 'A+', 1, 'Compatible Rh+ recipient'],
      ['O+', 'B+', 1, 'Compatible Rh+ recipient'],
      ['O+', 'AB+', 1, 'Compatible Rh+ recipient'],
      // A-
      ['A-', 'A-', 1, 'Exact match'],
      ['A-', 'A+', 1, 'Compatible Rh+ recipient'],
      ['A-', 'AB-', 1, 'Compatible AB recipient'],
      ['A-', 'AB+', 1, 'Compatible universal recipient'],
      // A+
      ['A+', 'A+', 1, 'Exact match'],
      ['A+', 'AB+', 1, 'Compatible AB+ recipient'],
      // B-
      ['B-', 'B-', 1, 'Exact match'],
      ['B-', 'B+', 1, 'Compatible Rh+ recipient'],
      ['B-', 'AB-', 1, 'Compatible AB recipient'],
      ['B-', 'AB+', 1, 'Compatible universal recipient'],
      // B+
      ['B+', 'B+', 1, 'Exact match'],
      ['B+', 'AB+', 1, 'Compatible AB+ recipient'],
      // AB-
      ['AB-', 'AB-', 1, 'Exact match'],
      ['AB-', 'AB+', 1, 'Compatible Rh+ recipient'],
      // AB+ (Universal recipient, only donates to AB+)
      ['AB+', 'AB+', 1, 'Exact match']
    ];

    const insertRule = db.prepare(`
      INSERT OR IGNORE INTO compatibility_rules (donor_group, recipient_group, component_type, enabled, notes)
      VALUES (?, ?, 'WHOLE_BLOOD', ?, ?)
    `);

    const insertMany = db.transaction((rules) => {
      for (const [d, r, e, n] of rules) {
        insertRule.run(d, r, e, n);
      }
    });

    insertMany(defaultRules);
  }
}

initSchema();

module.exports = db;
