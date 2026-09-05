import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart3, Settings, 
  AlertTriangle, RefreshCw, FileText, ToggleLeft, ToggleRight 
} from 'lucide-react';
import { type User, api } from '../services/api';

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'users' | 'rules' | 'audit'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [rulesList, setRulesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, usersRes, reqsRes, rulesRes, auditRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminAnalytics(),
        api.getAdminUsers(),
        api.getRequests(),
        api.getCompatibilityRules(),
        api.getAuditLogs()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (analyticsRes.success) setAnalytics(analyticsRes);
      if (usersRes.success) setUsersList(usersRes.users || []);
      if (reqsRes.success) setRequestsList(reqsRes.requests || []);
      if (rulesRes.success) setRulesList(rulesRes.rules || []);
      if (auditRes.success) setAuditLogs(auditRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (userId: number) => {
    try {
      const res = await api.toggleUserStatus(userId);
      if (res.success) {
        setUsersList(prev => prev.map(u => u.id === userId ? ({ ...u, status: res.status }) : u));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      const res = await api.approveRequest(requestId);
      if (res.success) {
        alert(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    const reason = prompt('Enter reason for administrative rejection:') || 'Rejected by administrator';
    try {
      const res = await api.rejectRequest(requestId, reason);
      if (res.success) {
        alert(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleRule = async (ruleId: number, currentEnabled: number) => {
    try {
      const res = await api.toggleCompatibilityRule(ruleId, !currentEnabled);
      if (res.success) {
        setRulesList(prev => prev.map(r => r.id === ruleId ? ({ ...r, enabled: currentEnabled ? 0 : 1 }) : r));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: '30px 24px 80px' }}>
      {/* Header & Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.8rem', color: '#fff' }}>Admin Command Center</h1>
            <span className="badge badge-ai">System Administrator</span>
            {loading && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Syncing...</span>}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            System-wide monitoring, verification queues, compatibility rules, and analytics.
          </p>
        </div>

        <button onClick={loadAdminData} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: 12,
        marginBottom: 28,
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'System Overview & Analytics', icon: BarChart3 },
          { id: 'requests', label: 'Emergency Requests Queue', icon: AlertTriangle },
          { id: 'users', label: 'User & Donor Accounts', icon: Users },
          { id: 'rules', label: 'Blood Compatibility Rules', icon: Settings },
          { id: 'audit', label: 'Audit Trail', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: isActive ? '#c084fc' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.88rem',
                border: isActive ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid transparent',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32
          }}>
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Registered Donors</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{stats?.totalDonors || 0}</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{stats?.availableDonors || 0} currently available</div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Active Emergencies</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171' }}>{stats?.activeRequests || 0}</div>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{stats?.pendingRequests || 0} awaiting authorization</div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Successful Donations</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>{stats?.totalDonations || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified hospital transfers</div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Avg Response Time</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>{stats?.avgResponseTimeMinutes || '8.5'}m</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>System-wide latency</div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Donor Acceptance Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{stats?.responseRate || 88}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Positive response ratio</div>
            </div>
          </div>

          {/* Visual Analytics Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            {/* Blood Demand Distribution */}
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Blood Group Demand Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analytics?.bloodDemand?.map((item: any) => (
                  <div key={item.blood_group}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{item.blood_group} Blood</span>
                      <span style={{ color: 'var(--text-muted)' }}>{item.total_units} unit(s) ({item.count} requests)</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (item.total_units / 6) * 100)}%`,
                        height: '100%',
                        backgroundColor: '#dc2626'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donor Blood Groups Pool */}
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Registered Donor Pool Distribution</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {analytics?.donorBloodGroups?.map((bg: any) => (
                  <div key={bg.blood_group} style={{
                    padding: '14px 10px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>{bg.blood_group}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {bg.count} donor{bg.count > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Emergency Requests Queue */}
      {activeTab === 'requests' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>All Platform Emergency Blood Requests</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px' }}>Request ID</th>
                  <th style={{ padding: '12px 14px' }}>Blood Group</th>
                  <th style={{ padding: '12px 14px' }}>Hospital</th>
                  <th style={{ padding: '12px 14px' }}>Location</th>
                  <th style={{ padding: '12px 14px' }}>Urgency</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Escalation</th>
                  <th style={{ padding: '12px 14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestsList.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#fff' }}>{req.reference_no}</td>
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-critical">{req.blood_group_needed}</span>
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600 }}>{req.hospital_name}</td>
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{req.hospital_location}</td>
                    <td style={{ padding: '14px' }}>
                      <span className={req.urgency === 'CRITICAL' ? 'badge badge-critical' : 'badge badge-high'}>
                        {req.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-medium">{req.status}</span>
                    </td>
                    <td style={{ padding: '14px', color: '#c084fc', fontWeight: 600 }}>
                      Round {req.escalation_round || 1}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {req.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleApproveRequest(req.id)}
                            className="btn-success"
                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                          >
                            Approve
                          </button>
                        )}
                        {['SUBMITTED', 'ACTIVE', 'MATCHING'].includes(req.status) && (
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="btn-danger"
                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: User & Donor Accounts */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Platform User Accounts ({usersList.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Name</th>
                  <th style={{ padding: '10px 14px' }}>Role</th>
                  <th style={{ padding: '10px 14px' }}>Blood / Type</th>
                  <th style={{ padding: '10px 14px' }}>Location</th>
                  <th style={{ padding: '10px 14px' }}>Availability</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email} • {u.phone}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={u.role === 'admin' ? 'badge badge-ai' : u.role === 'hospital' ? 'badge badge-critical' : 'badge badge-medium'}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {u.blood_group ? <span className="badge badge-critical">{u.blood_group}</span> : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {u.donor_location || u.hospital_location || 'Tamil Nadu'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {u.availability_status ? (
                        <span className={u.availability_status === 'AVAILABLE' ? 'badge badge-available' : 'badge badge-unavailable'}>
                          {u.availability_status}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={u.status === 'active' ? 'badge badge-available' : 'badge badge-rejected'}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={u.status === 'active' ? 'btn-danger' : 'btn-success'}
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          {u.status === 'active' ? 'Block Account' : 'Unblock'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Blood Compatibility Rules Matrix */}
      {activeTab === 'rules' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Relational Blood Compatibility Matrix</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Configured rules determining Layer 1 safety filter matching. Toggles take effect immediately.
              </p>
            </div>
            <span className="badge badge-ai">Database Configured</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Donor Blood Group</th>
                  <th style={{ padding: '10px 14px' }}>Recipient Group</th>
                  <th style={{ padding: '10px 14px' }}>Component</th>
                  <th style={{ padding: '10px 14px' }}>Rule Status</th>
                  <th style={{ padding: '10px 14px' }}>Clinical Rationale</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rulesList.map(rule => (
                  <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff' }}>
                      <span className="badge badge-critical">{rule.donor_group}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                      <span className="badge badge-medium">{rule.recipient_group}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{rule.component_type}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={rule.enabled ? 'badge badge-available' : 'badge badge-unavailable'}>
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      {rule.notes || 'Configured ABO/Rh rule'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.enabled)}
                        style={{
                          background: 'transparent',
                          color: rule.enabled ? '#34d399' : '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {rule.enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>System Audit Trail</h3>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>User</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                  <th style={{ padding: '10px 14px' }}>Entity</th>
                  <th style={{ padding: '10px 14px' }}>Metadata / Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.user_name || `User #${log.user_id}`}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge badge-ai" style={{ fontSize: '0.7rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {log.entity} #{log.entity_id}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '0.78rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
