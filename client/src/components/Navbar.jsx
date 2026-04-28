import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';

export default function Navbar() {
  const { user, logout, isAdmin, isOfficer } = useAuth();
  const { unreadCount, resetUnread } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user || !notifOpen) return;
    api.get('/notifications?limit=8').then(({ data }) => {
      setNotifications(data.notifications);
      resetUnread();
    }).catch(() => {});
  }, [notifOpen, user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav>
      {/* Left: Logo & Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div className="logo-circle">CP</div>
          <span className="logo-text">CivicPulse</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Map</Link>
          <Link to="/my-reports" className={`nav-link ${isActive('/my-reports') ? 'active' : ''}`}>My Reports</Link>
          <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>Notifications</Link>
          {isAdmin && <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>}
          {isOfficer && !isAdmin && <Link to="/officer" className={`nav-link ${isActive('/officer') ? 'active' : ''}`}>Officer</Link>}
        </div>
      </div>

      {/* Right: Notifications & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="notif-bell"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <div className="badge">{unreadCount > 9 ? '9+' : unreadCount}</div>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '42px',
                  width: '300px', background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Notifications</span>
                    <Link to="/notifications" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none' }} onClick={() => setNotifOpen(false)}>View all</Link>
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n._id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                          <p style={{ fontSize: '13px', color: '#1e293b', margin: '0 0 4px' }}>{n.message}</p>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div className="user-avatar" title={`Points: ${user.points || 0}`}>
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'RK'}
              </div>
              <div style={{ display: 'none', flexDirection: 'column', gap: '2px', '@media (min-width: 640px)': { display: 'flex' } }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{user.name}</span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>⭐ {user.points || 0} PTS {(user.points || 0) > 100 ? '🦸 Hero' : ''}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              style={{ 
                background: 'none', border: 'none', color: '#64748b', 
                fontSize: '13px', cursor: 'pointer', padding: '4px 8px' 
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{
            padding: '6px 16px', background: '#2563eb', color: '#fff',
            borderRadius: '7px', fontSize: '13px', fontWeight: '600',
            textDecoration: 'none'
          }}>Login</Link>
        )}
      </div>
    </nav>
  );
}
