import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DonorDashboard } from './components/DonorDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { type User, api, removeAuthToken, setAuthToken } from './services/api';
import { Heart, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('home');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<'donor' | 'hospital'>('donor');
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Restore existing session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.getMe();
        if (res.success && res.user) {
          setCurrentUser(res.user);
          if (res.user.role === 'donor') setActiveView('donor');
          else if (res.user.role === 'hospital') setActiveView('hospital');
          else if (res.user.role === 'admin') setActiveView('admin');
        }
      } catch (err) {
        // No valid token
        removeAuthToken();
      } finally {
        setAppLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
    setActiveView('home');
  };

  const handleOpenAuth = (role: 'donor' | 'hospital' = 'donor') => {
    setAuthModalRole(role);
    setAuthModalOpen(true);
  };

  const handleQuickLogin = async (email: string, role: string) => {
    try {
      const password = role === 'admin' ? 'Admin@123' : (role === 'hospital' ? 'Hospital@123' : 'Donor@123');
      const res = await api.login({ email, password });
      if (res.success) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        if (res.user.role === 'donor') setActiveView('donor');
        else if (res.user.role === 'hospital') setActiveView('hospital');
        else if (res.user.role === 'admin') setActiveView('admin');
      }
    } catch (err: any) {
      alert(`Quick login failed: ${err.message}`);
    }
  };

  if (appLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: '#f87171'
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(220,38,38,0.6)'
        }} className="emergency-pulse">
          <Heart size={28} color="#fff" />
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
          LifeLink Engine Starting...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Navigation */}
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        onQuickLogin={handleQuickLogin}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeView === 'home' && (
          <LandingPage
            onOpenAuth={handleOpenAuth}
            onQuickLogin={handleQuickLogin}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'donor' && currentUser && (
          <DonorDashboard currentUser={currentUser} />
        )}

        {activeView === 'hospital' && currentUser && (
          <HospitalDashboard currentUser={currentUser} />
        )}

        {activeView === 'admin' && currentUser && (
          <AdminDashboard currentUser={currentUser} />
        )}
      </main>

      {/* Global Medical Disclaimer & Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'rgba(10, 14, 23, 0.95)',
        padding: '36px 24px',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
            color: '#cbd5e1'
          }}>
            <ShieldCheck size={18} color="#10b981" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              LifeLink Emergency Blood Coordination & Intelligence Engine
            </span>
          </div>

          <p style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            maxWidth: 820,
            margin: '0 auto 16px',
            lineHeight: 1.6
          }}>
            <strong>Important Medical Disclaimer:</strong> LifeLink is a donor coordination and emergency notification platform. Blood group compatibility rules and AI priority scores are based on registered member parameters and configuration models. Final medical cross-matching, transfusion verification, and clinical eligibility must always be confirmed by qualified medical officers and authorized blood banks.
          </p>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            © {new Date().getFullYear()} LifeLink. Built for emergency healthcare response. No GPS tracking. Approximate proximity matching.
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authModalRole}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'donor') setActiveView('donor');
          else if (user.role === 'hospital') setActiveView('hospital');
          else if (user.role === 'admin') setActiveView('admin');
        }}
      />
    </div>
  );
};

export default App;
