import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, CheckCircle2, ShieldAlert, Sparkles, Eye, X 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  type User, 
  type BloodRequest, 
  type DonorResponseItem, 
  type RankedCandidate, 
  api 
} from '../services/api';

interface HospitalDashboardProps {
  currentUser: User;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = () => {
  const [stats, setStats] = useState<any>({
    totalRequests: 0,
    activeRequests: 0,
    fulfilledRequests: 0,
    potentialMatches: 0,
    responseRate: 100
  });
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [matchesData, setMatchesData] = useState<{
    responses: DonorResponseItem[];
    potentialDonorsPool: RankedCandidate[];
  } | null>(null);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    bloodGroupNeeded: 'O+',
    hospitalName: 'Lotus Emergency Hospital',
    hospitalLocation: 'Poondurai Road, Erode',
    hospitalDistrict: 'Erode',
    unitsRequired: 2,
    urgency: 'CRITICAL',
    requiredBy: '',
    notes: 'Emergency trauma ICU case. Immediate transfusion required.'
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const loadHospitalData = async () => {
    try {
      setLoading(true);
      const statsRes = await api.getHospitalStats();
      if (statsRes.success) setStats(statsRes.stats);

      const reqRes = await api.getRequests({ requesterOnly: 'true' });
      if (reqRes.success) setRequests(reqRes.requests || []);
    } catch (err) {
      console.error('Error fetching hospital data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalData();
    const interval = setInterval(loadHospitalData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenMatches = async (req: BloodRequest) => {
    setSelectedRequest(req);
    try {
      setMatchesLoading(true);
      const res = await api.getRequestMatches(req.id);
      if (res.success) {
        setMatchesData({
          responses: res.responses || [],
          potentialDonorsPool: res.potentialDonorsPool || []
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load matches');
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      const res = await api.createRequest(formData);
      if (res.success) {
        alert(res.message);
        setShowCreateModal(false);
        loadHospitalData();
        if (res.request) {
          handleOpenMatches(res.request);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit emergency request');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEscalate = async (requestId: number) => {
    try {
      const res = await api.escalateRequest(requestId);
      if (res.success) {
        alert(`Escalation Round advanced! ${res.result?.notifiedCount || 0} additional donors alerted.`);
        loadHospitalData();
        if (selectedRequest) {
          handleOpenMatches(selectedRequest);
        }
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyDonor = async (requestId: number, responseId: number) => {
    try {
      const res = await api.verifyDonorMatch(requestId, responseId, 'Hospital confirmed pre-transfusion screening.');
      if (res.success) {
        alert('Donor match verified by hospital.');
        if (selectedRequest) {
          handleOpenMatches(selectedRequest);
        }
        loadHospitalData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFulfill = async (requestId: number, donorIds: number[]) => {
    try {
      const res = await api.fulfillRequest(requestId, donorIds, 'Transfusion successfully completed.');
      if (res.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        alert(res.message);
        setSelectedRequest(null);
        loadHospitalData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 24px 80px' }}>
      {/* Top Bar: Title & Large + Create Request Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: 4 }}>
            Hospital Emergency Coordination
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage real-time blood requests, AI donor matches, and transfusion verifications.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary emergency-pulse"
          style={{ fontSize: '1rem', padding: '14px 24px', borderRadius: 12 }}
        >
          <PlusCircle size={20} />
          <span>+ Create Emergency Request</span>
        </button>
      </div>

      {/* Hospital Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 18,
        marginBottom: 36
      }}>
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Active Emergencies</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f87171' }}>
            {stats.activeRequests}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Potential Matches</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>
            {stats.potentialMatches}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Requests Fulfilled</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
            {stats.fulfilledRequests}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Donor Response Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7' }}>
            {stats.responseRate}%
          </div>
        </div>
      </div>

      {/* Active Blood Requests Board */}
      <div className="glass-panel" style={{ padding: 28, marginBottom: 36 }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={20} color="#f87171" />
          Emergency Requests Board
          {loading && <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}> (Updating...)</span>}
        </h2>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            No active blood requests created yet. Click "+ Create Emergency Request" above to launch donor matching.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Reference</th>
                  <th style={{ padding: '12px 16px' }}>Blood Group</th>
                  <th style={{ padding: '12px 16px' }}>Units</th>
                  <th style={{ padding: '12px 16px' }}>Urgency</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Escalation</th>
                  <th style={{ padding: '12px 16px' }}>Responses</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#fff' }}>
                      {req.reference_no}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-critical" style={{ fontSize: '0.85rem' }}>
                        {req.blood_group_needed}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {req.units_required} unit(s)
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={req.urgency === 'CRITICAL' ? 'badge badge-critical' : 'badge badge-high'}>
                        {req.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={
                        req.status === 'FULFILLED' ? 'badge badge-available' :
                        req.status === 'POTENTIAL_MATCHES' ? 'badge badge-available' :
                        req.status === 'MATCHING' ? 'badge badge-ai' : 'badge badge-medium'
                      }>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#c084fc', fontWeight: 600 }}>
                      Round {req.escalation_round || 1} of 3
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>
                        {req.stats?.accepted_count || 0} accepted
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {' '}/ {req.stats?.total_responses || 0} total
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleOpenMatches(req)}
                        className="btn-secondary"
                        style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                      >
                        <Eye size={15} />
                        <span>View Matches</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Emergency Request Creation Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ padding: 28, maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={22} color="#f87171" />
                <h3 style={{ fontSize: '1.3rem' }}>Create Emergency Blood Request</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Blood Group Required *
                  </label>
                  <select
                    value={formData.bloodGroupNeeded}
                    onChange={e => setFormData({ ...formData, bloodGroupNeeded: e.target.value })}
                    style={{ fontWeight: 600 }}
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Units Required *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.unitsRequired}
                    onChange={e => setFormData({ ...formData, unitsRequired: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    value={formData.hospitalName}
                    onChange={e => setFormData({ ...formData, hospitalName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Hospital Location / Area *
                  </label>
                  <input
                    type="text"
                    value={formData.hospitalLocation}
                    onChange={e => setFormData({ ...formData, hospitalLocation: e.target.value })}
                    placeholder="e.g. Poondurai Road, Erode"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Urgency Level *
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                  >
                    <option value="CRITICAL">🚨 Critical (Immediate Transfusion)</option>
                    <option value="HIGH">⚠️ High (Within 2 Hours)</option>
                    <option value="MEDIUM">🔵 Medium (Scheduled Today)</option>
                    <option value="NORMAL">⚪ Normal (Elective)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    District (Tamil Nadu) *
                  </label>
                  <select
                    value={formData.hospitalDistrict}
                    onChange={e => setFormData({ ...formData, hospitalDistrict: e.target.value })}
                  >
                    <option value="Erode">Erode</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Salem">Salem</option>
                    <option value="Tirupur">Tirupur</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Emergency Medical Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Patient condition, ICU ward number, doctor on duty..."
                />
              </div>

              <div style={{
                fontSize: '0.78rem',
                color: '#fef3c7',
                backgroundColor: 'rgba(245,158,11,0.1)',
                padding: '10px 14px',
                borderRadius: 8
              }}>
                ℹ️ <strong>System Automation:</strong> Upon submission, LifeLink's AI engine instantly filters compatible donors, ranks candidates by response likelihood, and alerts Round 1 donors.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary"
                >
                  <PlusCircle size={18} />
                  <span>{formSubmitting ? 'Launching Matching...' : 'Launch Emergency Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Review & Escalation Modal */}
      {selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 840, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: '1.4rem' }}>{selectedRequest.reference_no}</h3>
                  <span className="badge badge-critical">{selectedRequest.blood_group_needed}</span>
                  <span className="badge badge-ai">Escalation Round {selectedRequest.escalation_round || 1} of 3</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedRequest.hospital_name} • {selectedRequest.hospital_location} • Need {selectedRequest.units_required} unit(s)
                </p>
              </div>

              <button onClick={() => setSelectedRequest(null)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            {/* Escalation Control Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 10,
              marginBottom: 24,
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                  Escalation Progress: Round {selectedRequest.escalation_round || 1} of 3
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Targeted batch active. Escalate if responses are insufficient.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {selectedRequest.status !== 'FULFILLED' && selectedRequest.escalation_round < 3 && (
                  <button
                    onClick={() => handleEscalate(selectedRequest.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '8px 14px', borderColor: '#f59e0b', color: '#fbbf24' }}
                  >
                    ⚡ Advance to Round {(selectedRequest.escalation_round || 1) + 1}
                  </button>
                )}

                {selectedRequest.status !== 'FULFILLED' && matchesData?.responses.some(r => r.response === 'ACCEPTED') && (
                  <button
                    onClick={() => {
                      const acceptedDonors = matchesData.responses.filter(r => r.response === 'ACCEPTED').map(r => r.donor_id);
                      handleFulfill(selectedRequest.id, acceptedDonors);
                    }}
                    className="btn-success"
                    style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                  >
                    ✓ Mark Transfusion Fulfilled
                  </button>
                )}
              </div>
            </div>

            {/* Top Potential Matches Section (Accepted Responses) */}
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color="#10b981" />
                Responded Donors ({matchesData?.responses.length || 0})
              </h4>

              {matchesLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>Loading responses...</div>
              ) : matchesData?.responses.length === 0 ? (
                <div style={{
                  padding: 20,
                  textAlign: 'center',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: 10,
                  color: 'var(--text-dim)',
                  fontSize: '0.88rem'
                }}>
                  No donor responses recorded yet for this alert. Notified donors are currently reviewing in-app alerts.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {matchesData?.responses.map(res => (
                    <div 
                      key={res.response_id}
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                            {res.donor_name}
                          </span>
                          <span className="badge badge-critical">{res.donor_blood_group}</span>
                          <span className="badge badge-available">AI Score: {res.ai_match_score}%</span>
                          <span className={res.status === 'VERIFIED' ? 'badge badge-verified' : 'badge badge-medium'}>
                            {res.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Location: {res.donor_location} • Phone: {res.donor_phone}
                        </div>

                        {/* AI Explanation reasons */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {res.score_reasons?.map((reason, i) => (
                            <span key={i} style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4 }}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        {res.status !== 'VERIFIED' && selectedRequest.status !== 'FULFILLED' ? (
                          <button
                            onClick={() => handleVerifyDonor(selectedRequest.id, res.response_id)}
                            className="btn-success"
                            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                          >
                            Verify Match
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                            ✓ Medically Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Ranked Candidate Pool (Next In Line) */}
            <div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#a855f7" />
                AI Ranked Donor Pool ({matchesData?.potentialDonorsPool.length || 0} Eligible in Network)
              </h4>

              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matchesData?.potentialDonorsPool.map(donor => (
                  <div 
                    key={donor.donor_id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{donor.name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                        ({donor.blood_group}) • {donor.approximate_proximity}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#c084fc', fontWeight: 700 }}>
                        {donor.ai_match_score}% AI Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Disclaimer */}
            <div style={{
              fontSize: '0.75rem',
              color: '#fef3c7',
              backgroundColor: 'rgba(245,158,11,0.08)',
              padding: '10px 14px',
              borderRadius: 8,
              marginTop: 20
            }}>
              <strong>Safety Note:</strong> AI Priority Score represents predicted response probability and coordination readiness. Final transfusion decisions and medical cross-matching must be performed by hospital blood bank personnel.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
