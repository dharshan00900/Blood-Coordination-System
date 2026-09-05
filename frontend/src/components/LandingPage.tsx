import React from 'react';
import { 
  HeartHandshake, ShieldAlert, Cpu, Zap, Users, 
  ArrowRight, ShieldCheck, Sparkles, AlertCircle 
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (role?: 'donor' | 'hospital') => void;
  onQuickLogin: (email: string, role: string) => void;
  setActiveView?: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onQuickLogin
}) => {
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '70px 24px 50px',
        textAlign: 'center',
        maxWidth: 1100,
        margin: '0 auto'
      }}>
        {/* Urgent Live Coordination Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          borderRadius: 9999,
          background: 'rgba(220, 38, 38, 0.12)',
          border: '1px solid rgba(220, 38, 38, 0.35)',
          marginBottom: 24
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#ef4444'
          }} className="status-dot-pulse" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fca5a5', letterSpacing: '0.02em' }}>
            Active AI Emergency Blood Coordination Network
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 20
        }}>
          When Every Minute Matters.
        </h1>

        <p style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: 'var(--text-muted)',
          maxWidth: 780,
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          LifeLink intelligently connects emergency hospital blood requests with registered, eligible donors who are most likely to respond and save a life.
        </p>

        {/* Primary CTAs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 48
        }}>
          <button 
            onClick={() => onOpenAuth('hospital')}
            className="btn-primary"
            style={{ fontSize: '1rem', padding: '14px 28px', borderRadius: 12 }}
          >
            <ShieldAlert size={20} />
            <span>Find Blood Support</span>
            <ArrowRight size={18} />
          </button>

          <button 
            onClick={() => onOpenAuth('donor')}
            className="btn-secondary"
            style={{ fontSize: '1rem', padding: '14px 28px', borderRadius: 12 }}
          >
            <HeartHandshake size={20} color="#f87171" />
            <span>Become a Donor</span>
          </button>
        </div>

        {/* 1-Click Interactive Demo Selector Bar */}
        <div className="glass-panel" style={{
          padding: '16px 20px',
          maxWidth: 880,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          border: '1px solid rgba(220, 38, 38, 0.25)',
          background: 'rgba(15, 23, 42, 0.85)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#f59e0b" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                Instant Demonstration Suite
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Test end-to-end emergency flow in 1 click:
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button 
              onClick={() => onQuickLogin('lotus.erode@hospital.org', 'hospital')}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              🏥 Lotus Hospital (Erode)
            </button>
            <button 
              onClick={() => onQuickLogin('rajesh.erode@gmail.com', 'donor')}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              🩸 Donor Rajesh (O+)
            </button>
            <button 
              onClick={() => onQuickLogin('admin@lifelink.org', 'admin')}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              🛡️ System Admin
            </button>
          </div>
        </div>
      </section>

      {/* Platform Real-Time Metrics */}
      <section style={{ maxWidth: 1200, margin: '0 auto 60px', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20
        }}>
          <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#f87171' }}>
              <Users size={28} />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>12+</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Registered Donors (Tamil Nadu)</div>
          </div>

          <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#10b981' }}>
              <Zap size={28} />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>&lt; 8.5 min</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average AI Matching Latency</div>
          </div>

          <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#8b5cf6' }}>
              <Cpu size={28} />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>94%</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Donor Response Prediction Accuracy</div>
          </div>

          <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#38bdf8' }}>
              <ShieldCheck size={28} />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hospital Verified Transfers</div>
          </div>
        </div>
      </section>

      {/* How LifeLink Works */}
      <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>How LifeLink Coordinates Emergencies</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
            A four-stage rapid response pipeline engineered for zero friction in critical situations.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24
        }}>
          <div className="glass-panel" style={{ padding: 28, position: 'relative' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(220,38,38,0.2)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              marginBottom: 16
            }}>1</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Register</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Donors input blood group, approximate locality (e.g., Erode, Coimbatore), and donation history. <strong>No invasive GPS tracking.</strong>
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28, position: 'relative' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(139,92,246,0.2)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              marginBottom: 16
            }}>2</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>AI Matching</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The system enforces configurable ABO/Rh rules and 90-day waiting limits, then ranks donors by predicted response probability.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28, position: 'relative' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(245,158,11,0.2)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              marginBottom: 16
            }}>3</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Targeted Alert</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Donors receive direct in-app emergency notifications and respond with <strong>"I Can Help"</strong> or <strong>"Decline"</strong> in seconds.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 28, position: 'relative' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(16,185,129,0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              marginBottom: 16
            }}>4</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Hospital Transfusion</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The hospital reviews ranked potential matches, conducts final medical confirmation, and marks the request fulfilled.
            </p>
          </div>
        </div>
      </section>

      {/* Two-Layer AI Architecture Highlight */}
      <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 24px' }}>
        <div className="glass-panel" style={{
          padding: '40px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          background: 'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,27,75,0.4))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Cpu size={24} color="#a855f7" />
            <h2 style={{ fontSize: '1.6rem' }}>Two-Layer Intelligent Matching Engine</h2>
          </div>

          <p style={{ color: 'var(--text-muted)', marginBottom: 28, maxWidth: 820 }}>
            LifeLink decouples medical safety from algorithmic prioritization. Medical rules always take precedence, and AI predicts donor responsiveness within that safe candidate boundary.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24
          }}>
            <div style={{
              padding: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="badge badge-critical">Layer 1</span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Rule-Based Safety Filter</h4>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: '#cbd5e1' }}>
                <li>✓ <strong>Configurable ABO/Rh Compatibility:</strong> Database-driven compatibility rules matrix.</li>
                <li>✓ <strong>90-Day Waiting Period:</strong> Automatically validates last donation interval.</li>
                <li>✓ <strong>Availability Check:</strong> Only notifies currently active and available donors.</li>
                <li>✓ <strong>Location Hierarchy:</strong> Matches approximate town/district proximity without tracking GPS.</li>
              </ul>
            </div>

            <div style={{
              padding: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(139,92,246,0.06)',
              border: '1px solid rgba(139,92,246,0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="badge badge-ai">Layer 2</span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>AI Donor Priority Scoring</h4>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: '#cbd5e1' }}>
                <li>✓ <strong>Predictive Model:</strong> Evaluates acceptance probability P(Response = Help | Urgency, Proximity).</li>
                <li>✓ <strong>Historical Reliability:</strong> Weights past response rates and average acceptance speed.</li>
                <li>✓ <strong>Explainable AI Rationale:</strong> Shows healthcare teams transparent reasons for every priority score.</li>
                <li>✓ <strong>Cold-Start Heuristic:</strong> Gracefully defaults to baseline scoring for new donors.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Round Escalation Section */}
      <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Intelligent Multi-Round Escalation</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 640, margin: '0 auto' }}>
            LifeLink avoids donor fatigue by alerting donors in targeted, tiered batches rather than broadcasting spam.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20
        }}>
          <div className="glass-panel" style={{ padding: 24, borderTop: '3px solid #10b981' }}>
            <span className="badge badge-available" style={{ marginBottom: 12 }}>Round 1: Priority Core</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Alerts the top-ranked compatible donors in immediate proximity. Waits for a designated response window.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 24, borderTop: '3px solid #f59e0b' }}>
            <span className="badge badge-high" style={{ marginBottom: 12 }}>Round 2: Secondary Tier</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              If responses are below required units, automatically escalates to the next tier of verified donors.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 24, borderTop: '3px solid #dc2626' }}>
            <span className="badge badge-critical" style={{ marginBottom: 12 }}>Round 3: Expanded Pool</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Broadens geographic range to neighboring districts and compatible universal donor types (e.g. O-).
            </p>
          </div>
        </div>
      </section>

      {/* Prominent Medical Safety Disclaimer (Section 50) */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{
          padding: '24px 30px',
          borderLeft: '4px solid #f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <AlertCircle size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fef3c7', marginBottom: 6 }}>
                Important Medical & Coordination Disclaimer
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#fef3c7', opacity: 0.9, lineHeight: 1.6 }}>
                LifeLink is an emergency donor coordination and matching platform. Compatibility and eligibility shown by the system are based on registered information and configured rules. Final blood compatibility, donor eligibility, and transfusion decisions must be confirmed by qualified healthcare professionals or the relevant blood bank.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
