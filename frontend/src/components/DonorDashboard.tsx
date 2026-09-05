import React, { useState, useEffect } from 'react';
import { 
  Heart, MapPin, Calendar, Activity, CheckCircle2, XCircle, 
  ShieldCheck, Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { type User, type DonorProfile, type DonorBehavior, api } from '../services/api';

interface DonorDashboardProps {
  currentUser: User;
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({ currentUser }) => {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [behavior, setBehavior] = useState<DonorBehavior | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [daysUntilEligible, setDaysUntilEligible] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [responseSubmitting, setResponseSubmitting] = useState<boolean>(false);
  const [responseResultModal, setResponseResultModal] = useState<any | null>(null);

  const loadDonorData = async () => {
    try {
      setLoading(true);
      const res = await api.getDonorProfile();
      if (res.success) {
        setProfile(res.profile);
        setBehavior(res.behavior);
        setDonations(res.donations || []);
        setDaysUntilEligible(res.daysUntilEligible || 0);
      }

      const reqRes = await api.getDonorRequests();
      if (reqRes.success) {
        setRequests(reqRes.requests || []);
        // Check if there is an unresponded active request for alert banner
        const pending = reqRes.requests.find(
          r => !r.donor_response && ['ACTIVE', 'MATCHING', 'DONOR_RESPONSES'].includes(r.request_status)
        );
        if (pending) {
          setActiveAlert(pending);
        } else {
          setActiveAlert(null);
        }
      }
    } catch (err) {
      console.error('Error loading donor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonorData();
    const interval = setInterval(loadDonorData, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAvailability = async () => {
    try {
      const res = await api.toggleAvailability();
      if (res.success && profile) {
        setProfile({
          ...profile,
          availability_status: res.availabilityStatus
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRespond = async (requestId: number, response: 'ACCEPTED' | 'DECLINED') => {
    try {
      setResponseSubmitting(true);
      const res = await api.respondToRequest(requestId, response);
      if (res.success) {
        if (response === 'ACCEPTED') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
        setResponseResultModal(res);
        setActiveAlert(null);
        loadDonorData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setResponseSubmitting(false);
    }
  };

  if (loading && !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>Loading Donor Profile...</div>
        <div style={{ fontSize: '0.85rem' }}>Fetching eligibility and emergency records</div>
      </div>
    );
  }

  const isAvailable = profile?.availability_status === 'AVAILABLE';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 24px 80px' }}>
      {/* Prominent Emergency Alert Banner (if selected for emergency request) */}
      {activeAlert && (
        <div className="glass-panel emergency-pulse" style={{
          padding: '24px 28px',
          marginBottom: 32,
          border: '2px solid #dc2626',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(220,38,38,0.8)',
                flexShrink: 0
              }}>
                <Heart size={26} color="#fff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="badge badge-critical">🚨 Urgent Blood Request</span>
                  <span className="badge badge-ai">Escalation Round {activeAlert.escalation_round || 1}</span>
                </div>
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 4 }}>
                  {activeAlert.blood_group_needed} Blood Needed Urgently
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#fca5a5' }}>
                  <strong>{activeAlert.hospital_name}</strong> ({activeAlert.hospital_location}) requires{' '}
                  <strong>{activeAlert.units_required} unit(s)</strong> • Urgency: <strong>{activeAlert.urgency}</strong>
                </p>
                {activeAlert.notes && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    "{activeAlert.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                disabled={responseSubmitting}
                onClick={() => handleRespond(activeAlert.request_id, 'ACCEPTED')}
                className="btn-success"
                style={{ fontSize: '1rem', padding: '12px 24px', borderRadius: 10 }}
              >
                <CheckCircle2 size={20} />
                <span>{responseSubmitting ? 'Recording...' : 'I CAN HELP'}</span>
              </button>

              <button
                disabled={responseSubmitting}
                onClick={() => handleRespond(activeAlert.request_id, 'DECLINED')}
                className="btn-danger"
                style={{ fontSize: '0.95rem', padding: '12px 20px', borderRadius: 10 }}
              >
                <XCircle size={18} />
                <span>DECLINE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Confirmation Modal */}
      {responseResultModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: responseResultModal.response === 'ACCEPTED' ? 'rgba(16,185,129,0.2)' : 'rgba(220,38,38,0.2)',
              color: responseResultModal.response === 'ACCEPTED' ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              {responseResultModal.response === 'ACCEPTED' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            </div>

            <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>
              {responseResultModal.response === 'ACCEPTED' ? 'Potential Match Recorded' : 'Response Submitted'}
            </h3>

            <div className="badge badge-available" style={{ fontSize: '0.85rem', padding: '6px 14px', marginBottom: 16 }}>
              Status: {responseResultModal.statusLabel}
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              {responseResultModal.message}
            </p>

            {responseResultModal.response === 'ACCEPTED' && (
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: 16,
                textAlign: 'left',
                marginBottom: 20,
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={16} color="#a855f7" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    AI Donor Priority Score: {responseResultModal.aiMatchScore}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {responseResultModal.scoreExplanations?.map((exp: string, idx: number) => (
                    <span key={idx} style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              fontSize: '0.78rem',
              color: '#fef3c7',
              backgroundColor: 'rgba(245,158,11,0.1)',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 24,
              textAlign: 'left'
            }}>
              <strong>Medical Disclaimer:</strong> {responseResultModal.disclaimer}
            </div>

            <button
              onClick={() => setResponseResultModal(null)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Header: Welcome & Availability Toggle Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Profile Card */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                Welcome back, {currentUser.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <MapPin size={15} color="#f87171" />
                <span>{profile?.location} • {profile?.district}</span>
              </div>
            </div>

            <div style={{
              padding: '10px 18px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              textAlign: 'center',
              boxShadow: '0 4px 14px rgba(220,38,38,0.4)'
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {profile?.blood_group}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blood Group
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className={profile?.eligibility_status === 'ELIGIBLE' ? 'badge badge-available' : 'badge badge-high'}>
              <ShieldCheck size={14} />
              {profile?.eligibility_status === 'ELIGIBLE' ? 'Medically Eligible' : `In Waiting Period (${daysUntilEligible}d left)`}
            </span>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} />
              Last Donated: {profile?.last_donation_date ? new Date(profile.last_donation_date).toLocaleDateString() : 'Never / First Time'}
            </span>
          </div>
        </div>

        {/* Availability Status Card (Section 7) */}
        <div className="glass-panel" style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderLeft: isAvailable ? '4px solid #10b981' : '4px solid #ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Current Availability Status
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isAvailable ? (
                  <>
                    <span style={{ color: '#10b981' }}>🟢 AVAILABLE</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#ef4444' }}>🔴 UNAVAILABLE</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleToggleAvailability}
              className={isAvailable ? 'btn-danger' : 'btn-success'}
              style={{ fontSize: '0.85rem' }}
            >
              {isAvailable ? 'Set Unavailable' : 'Set Available'}
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            {isAvailable 
              ? 'You will be considered by the AI matching engine for nearby emergency hospital requests.' 
              : 'You are currently opted out of emergency alerts. Toggle back to Available when ready to help.'}
          </p>
        </div>
      </div>

      {/* Response Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 36
      }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Requests Received</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            {behavior?.requests_received || requests.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Responses Recorded</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38bdf8' }}>
            {behavior?.requests_responded || requests.filter(r => r.donor_response).length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Successful Donations</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
            {behavior?.successful_donations || donations.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Avg Response Time</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#a855f7' }}>
            {behavior?.average_response_time ? `${behavior.average_response_time.toFixed(1)}m` : '8.5m'}
          </div>
        </div>
      </div>

      {/* Emergency Requests Feed / History */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={20} color="#f87171" />
          Emergency Blood Requests History
        </h3>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)' }}>
            No emergency requests currently logged for your profile.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((req, idx) => (
              <div 
                key={idx}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                      {req.reference_no}
                    </span>
                    <span className="badge badge-critical">{req.blood_group_needed}</span>
                    <span className="badge badge-high">{req.urgency}</span>
                    <span className="badge badge-ai">Round {req.escalation_round || 1}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {req.hospital_name} • {req.hospital_location} • {req.units_required} unit(s)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {req.donor_response ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className={req.donor_response === 'ACCEPTED' ? 'badge badge-available' : 'badge badge-unavailable'}>
                        {req.donor_response === 'ACCEPTED' ? 'You Responded: I Can Help' : 'You Declined'}
                      </span>
                      {req.ai_match_score && (
                        <span style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: 4 }}>
                          AI Match Score: {req.ai_match_score}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleRespond(req.request_id, 'ACCEPTED')}
                        className="btn-success"
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        I Can Help
                      </button>
                      <button
                        onClick={() => handleRespond(req.request_id, 'DECLINED')}
                        className="btn-secondary"
                        style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Donation History Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart size={20} color="#10b981" />
          Verified Donation History
        </h3>

        {donations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            No past donations recorded yet. When a hospital fulfills a transfusion, it will appear here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Hospital</th>
                  <th style={{ padding: '10px 14px' }}>Location</th>
                  <th style={{ padding: '10px 14px' }}>Blood Group</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 14px', color: '#fff' }}>
                      {new Date(d.donated_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{d.hospital_name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{d.hospital_location}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-critical">{d.blood_group_needed}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-verified">✓ {d.verification_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
