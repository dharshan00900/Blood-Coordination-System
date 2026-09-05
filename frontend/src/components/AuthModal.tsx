import React, { useState } from 'react';
import { X, Lock, Heart } from 'lucide-react';
import { api, setAuthToken } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'donor' | 'hospital';
  onLoginSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'donor',
  onLoginSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'donor' | 'hospital'>(initialRole);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91-');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [location, setLocation] = useState('Periyar Nagar, Erode');
  const [district, setDistrict] = useState('Erode');
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [availability, setAvailability] = useState('AVAILABLE');
  const [hospitalName, setHospitalName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.success) {
        setAuthToken(res.token);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        email,
        phone,
        password,
        confirmPassword,
        role,
        location,
        district,
        consentGiven
      };

      if (role === 'donor') {
        payload.bloodGroup = bloodGroup;
        payload.lastDonationDate = lastDonationDate || null;
        payload.availability = availability;
      } else {
        payload.hospitalName = hospitalName;
        payload.registrationNo = registrationNo || 'TN-MED-DEMO';
      }

      const res = await api.register(payload);
      if (res.success) {
        setAuthToken(res.token);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 520, padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Heart size={18} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>
              {tab === 'login' ? 'Sign In to LifeLink' : 'Create an Account'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: 4,
          borderRadius: 8,
          marginBottom: 20
        }}>
          <button
            onClick={() => { setTab('login'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 6,
              background: tab === 'login' ? 'rgba(220,38,38,0.3)' : 'transparent',
              color: tab === 'login' ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 6,
              background: tab === 'register' ? 'rgba(220,38,38,0.3)' : 'transparent',
              color: tab === 'register' ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            New Registration
          </button>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: '0.85rem',
            marginBottom: 16
          }}>
            {errorMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              <Lock size={16} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>

            {/* Fast Demo Buttons */}
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase' }}>
                Fill Test Credentials:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('rajesh.erode@gmail.com', 'Donor@123')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Donor Rajesh (O+)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('lotus.erode@hospital.org', 'Hospital@123')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Hospital Lotus (Erode)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('admin@lifelink.org', 'Admin@123')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Admin Commander
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Role Select */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Registering As:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRole('donor')}
                  style={{
                    padding: '8px',
                    borderRadius: 6,
                    border: role === 'donor' ? '2px solid #dc2626' : '1px solid var(--border-color)',
                    background: role === 'donor' ? 'rgba(220,38,38,0.15)' : 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  🩸 Blood Donor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('hospital')}
                  style={{
                    padding: '8px',
                    borderRadius: 6,
                    border: role === 'hospital' ? '2px solid #dc2626' : '1px solid var(--border-color)',
                    background: role === 'hospital' ? 'rgba(220,38,38,0.15)' : 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  🏥 Hospital / Requester
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ramesh V"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91-98421..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  District (Tamil Nadu) *
                </label>
                <select value={district} onChange={e => setDistrict(e.target.value)}>
                  <option value="Erode">Erode</option>
                  <option value="Coimbatore">Coimbatore</option>
                  <option value="Salem">Salem</option>
                  <option value="Tirupur">Tirupur</option>
                  <option value="Chennai">Chennai</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Approximate Area / Locality (No GPS tracking) *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Perundurai, Erode"
              />
            </div>

            {/* Donor specific fields */}
            {role === 'donor' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Blood Group *
                    </label>
                    <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Last Donation Date
                    </label>
                    <input
                      type="date"
                      value={lastDonationDate}
                      onChange={e => setLastDonationDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Initial Availability
                  </label>
                  <select value={availability} onChange={e => setAvailability(e.target.value)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="UNAVAILABLE">Temporarily Unavailable</option>
                  </select>
                </div>
              </>
            )}

            {/* Hospital specific fields */}
            {role === 'hospital' && (
              <>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={e => setHospitalName(e.target.value)}
                    placeholder="e.g. Apex Multi-specialty Hospital"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Medical Registration Number
                  </label>
                  <input
                    type="text"
                    value={registrationNo}
                    onChange={e => setRegistrationNo(e.target.value)}
                    placeholder="e.g. TN-MED-ERD-9941"
                  />
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: 4 }}>
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>I consent to receive emergency blood coordination alerts via LifeLink.</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            >
              <Heart size={16} />
              <span>{loading ? 'Creating Profile...' : 'Complete Registration'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
