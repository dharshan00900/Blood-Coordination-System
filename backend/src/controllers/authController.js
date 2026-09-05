const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');
const { logAudit } = require('../middleware/auth');

class AuthController {
  register(req, res) {
    try {
      const {
        name,
        email,
        phone,
        password,
        confirmPassword,
        role,
        bloodGroup,
        location,
        district,
        state = 'Tamil Nadu',
        lastDonationDate,
        availability = 'AVAILABLE',
        hospitalName,
        registrationNo,
        consentGiven
      } = req.body;

      if (!name || !email || !phone || !password || !role) {
        return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }

      if (!['donor', 'hospital'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid registration role.' });
      }

      // Check existing email
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);

      const runTx = db.transaction(() => {
        // Insert User
        const userRes = db.prepare(`
          INSERT INTO users (name, email, phone, password_hash, role, status)
          VALUES (?, ?, ?, ?, ?, 'active')
        `).run(name, email, phone, passwordHash, role);

        const userId = userRes.lastInsertRowid;

        if (role === 'donor') {
          if (!bloodGroup || !location) {
            throw new Error('Blood group and approximate location are required for donors.');
          }

          const dist = district || location.split(',')[0].trim();

          // Calculate initial eligibility
          let eligibility = 'ELIGIBLE';
          if (lastDonationDate) {
            const daysSince = Math.floor((new Date() - new Date(lastDonationDate)) / (1000 * 60 * 60 * 24));
            if (daysSince < config.DONATION_INTERVAL_DAYS) {
              eligibility = 'NOT_CURRENTLY_ELIGIBLE';
            }
          }

          db.prepare(`
            INSERT INTO donor_profiles (
              user_id, blood_group, location, district, state,
              last_donation_date, availability_status, eligibility_status,
              response_rate, average_response_time, consent_given
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, 10.0, ?)
          `).run(
            userId,
            bloodGroup,
            location,
            dist,
            state,
            lastDonationDate || null,
            availability,
            eligibility,
            consentGiven ? 1 : 1
          );

          db.prepare(`
            INSERT INTO donor_behavior (donor_id, requests_received, requests_responded, requests_accepted, average_response_time, successful_donations)
            VALUES (?, 0, 0, 0, 10.0, 0)
          `).run(userId);
        } else if (role === 'hospital') {
          if (!hospitalName || !location) {
            throw new Error('Hospital name and location are required.');
          }
          const dist = district || location.split(',')[0].trim();
          db.prepare(`
            INSERT INTO hospitals (user_id, hospital_name, location, district, registration_no, verification_status)
            VALUES (?, ?, ?, ?, ?, 'VERIFIED')
          `).run(userId, hospitalName, location, dist, registrationNo || 'TN-MED-DEMO');
        }

        return userId;
      });

      const newUserId = runTx();
      logAudit(newUserId, 'USER_REGISTERED', 'users', newUserId, { role, email }, req);

      const user = db.prepare('SELECT id, name, email, phone, role, status FROM users WHERE id = ?').get(newUserId);
      const token = jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to LifeLink.',
        token,
        user
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Registration failed.' });
    }
  }

  login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Account is blocked. Contact support.' });
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: '7d' });
      logAudit(user.id, 'USER_LOGIN', 'users', user.id, { role: user.role }, req);

      // Return user without password_hash
      const { password_hash, ...safeUser } = user;

      // Attach profile info if donor or hospital
      let profile = null;
      if (user.role === 'donor') {
        profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(user.id);
      } else if (user.role === 'hospital') {
        profile = db.prepare('SELECT * FROM hospitals WHERE user_id = ?').get(user.id);
      }

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: safeUser,
        profile
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  me(req, res) {
    try {
      const user = db.prepare('SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
      let profile = null;
      if (user.role === 'donor') {
        profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(user.id);
      } else if (user.role === 'hospital') {
        profile = db.prepare('SELECT * FROM hospitals WHERE user_id = ?').get(user.id);
      }

      return res.json({
        success: true,
        user,
        profile
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  getDemoAccounts(req, res) {
    const demoUsers = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status,
             dp.blood_group, dp.location as donor_loc, dp.availability_status,
             h.hospital_name, h.location as hospital_loc
      FROM users u
      LEFT JOIN donor_profiles dp ON u.id = dp.user_id
      LEFT JOIN hospitals h ON u.id = h.user_id
      ORDER BY u.id ASC
    `).all();

    return res.json({
      success: true,
      accounts: demoUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bloodGroup: u.blood_group,
        location: u.donor_loc || u.hospital_loc || 'Tamil Nadu',
        status: u.availability_status || u.status,
        defaultPassword: u.role === 'admin' ? 'Admin@123' : (u.role === 'hospital' ? 'Hospital@123' : 'Donor@123')
      }))
    });
  }
}

module.exports = new AuthController();
