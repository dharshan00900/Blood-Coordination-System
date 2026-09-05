import React, { useState, useEffect, useRef } from 'react';
import { 
  HeartHandshake, Bell, Shield, Hospital as HospitalIcon, User as UserIcon, 
  LogOut, CheckCircle2, ChevronDown, Activity 
} from 'lucide-react';
import { type User, type NotificationItem, api } from '../services/api';

interface NavbarProps {
  currentUser: User | null;
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  onOpenAuth: (role?: 'donor' | 'hospital') => void;
  onQuickLogin: (email: string, role: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  setActiveView,
  onLogout,
  onOpenAuth,
  onQuickLogin
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  // Poll or fetch notifications when logged in
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setShowDemoMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev: NotificationItem[]) => prev.map((n: NotificationItem) => ({ ...n, status: 'READ' })));
    } catch (e) {}
  };

  const handleNotifClick = async (notif: NotificationItem) => {
    if (notif.status === 'UNREAD') {
      try {
        await api.markNotificationRead(notif.id);
        setUnreadCount((prev: number) => Math.max(0, prev - 1));
        setNotifications((prev: NotificationItem[]) => prev.map((n: NotificationItem) => n.id === notif.id ? ({ ...n, status: 'READ' }) : n));
      } catch (e) {}
    }
    if (currentUser?.role === 'donor') setActiveView('donor');
    else if (currentUser?.role === 'hospital') setActiveView('hospital');
    else if (currentUser?.role === 'admin') setActiveView('admin');
    setShowNotifMenu(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(10, 14, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: 1380,
        margin: '0 auto',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveView('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.45)',
            position: 'relative'
          }}>
            <HeartHandshake size={24} color="#fff" />
            <div style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid #0a0e17'
            }} className="status-dot-pulse" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
                Life<span style={{ color: '#ef4444' }}>Link</span>
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: -2 }}>
              Emergency Blood Coordination Platform
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            onClick={() => setActiveView('home')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeView === 'home' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeView === 'home' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Overview
          </button>

          {currentUser?.role === 'donor' && (
            <button 
              onClick={() => setActiveView('donor')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'donor' ? 'rgba(220, 38, 38, 0.2)' : 'transparent',
                color: activeView === 'donor' ? '#fca5a5' : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <UserIcon size={16} /> Donor Dashboard
            </button>
          )}

          {currentUser?.role === 'hospital' && (
            <button 
              onClick={() => setActiveView('hospital')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'hospital' ? 'rgba(220, 38, 38, 0.2)' : 'transparent',
                color: activeView === 'hospital' ? '#fca5a5' : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <HospitalIcon size={16} /> Hospital Portal
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => setActiveView('admin')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: activeView === 'admin' ? '#c084fc' : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Shield size={16} /> Admin Command
            </button>
          )}
        </nav>

        {/* Right Section: Quick Demo Switcher + Notifications + Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quick Demo Role Switcher Dropdown */}
          <div ref={demoRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '7px 12px',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                background: 'rgba(220, 38, 38, 0.1)'
              }}
            >
              <Activity size={14} color="#f87171" />
              <span>Switch Demo Role</span>
              <ChevronDown size={14} />
            </button>

            {showDemoMenu && (
              <div className="glass-panel" style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 320,
                padding: 12,
                zIndex: 1000,
                boxShadow: '0 20px 35px -5px rgba(0,0,0,0.8)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Fast Demo Role Switcher
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button 
                    onClick={() => { onQuickLogin('admin@lifelink.org', 'admin'); setShowDemoMenu(false); }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Admin Commander</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>admin@lifelink.org</div>
                    </div>
                    <span className="badge badge-ai" style={{ fontSize: '0.65rem' }}>Admin</span>
                  </button>

                  <button 
                    onClick={() => { onQuickLogin('lotus.erode@hospital.org', 'hospital'); setShowDemoMenu(false); }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lotus Hospital (Erode)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>lotus.erode@hospital.org</div>
                    </div>
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>Hospital</span>
                  </button>

                  <button 
                    onClick={() => { onQuickLogin('rajesh.erode@gmail.com', 'donor'); setShowDemoMenu(false); }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Rajesh Kumar (O+ Erode)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Top Priority Donor candidate</div>
                    </div>
                    <span className="badge badge-available" style={{ fontSize: '0.65rem' }}>Donor O+</span>
                  </button>

                  <button 
                    onClick={() => { onQuickLogin('priya.erode@gmail.com', 'donor'); setShowDemoMenu(false); }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Priya Raman (O+ Erode)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>High-responsiveness donor</div>
                    </div>
                    <span className="badge badge-available" style={{ fontSize: '0.65rem' }}>Donor O+</span>
                  </button>

                  <button 
                    onClick={() => { onQuickLogin('ananya.cbe@gmail.com', 'donor'); setShowDemoMenu(false); }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Ananya V. (O- Coimbatore)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Universal RBC donor</div>
                    </div>
                    <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>Donor O-</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* In-App Notifications Dropdown */}
          {currentUser && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: showNotifMenu ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: unreadCount > 0 ? '#f87171' : 'var(--text-muted)'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(220,38,38,0.8)'
                  }} className="status-dot-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 360,
                  maxHeight: 460,
                  overflowY: 'auto',
                  padding: 16,
                  zIndex: 1000,
                  boxShadow: '0 20px 35px -5px rgba(0,0,0,0.8)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Emergency Alerts</h4>
                      {unreadCount > 0 && (
                        <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                          {unreadCount} Unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        style={{ background: 'transparent', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 500 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      No recent notifications
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notifications.map((n: NotificationItem) => (
                        <div 
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            cursor: 'pointer',
                            backgroundColor: n.status === 'UNREAD' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            borderLeft: n.status === 'UNREAD' ? '3px solid #dc2626' : '3px solid transparent',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: 600, 
                              color: n.urgency === 'CRITICAL' ? '#f87171' : '#fff' 
                            }}>
                              {n.title}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                              {new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255,255,255,0.06)'
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}>
                  {currentUser.name.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button 
                onClick={onLogout}
                title="Logout"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                onClick={() => onOpenAuth('donor')}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                Sign In
              </button>
              <button 
                onClick={() => onOpenAuth('donor')}
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Become a Donor
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
