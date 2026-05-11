import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { resetUnread } = useSocket()
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    load()
    resetUnread()
  }, [page])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications', { params: { page, limit: 20 } })
      setNotifications(data.notifications || [])
      setTotal(data.total)
      setUnread(data.unread)
      setPages(data.pages)
    } catch {} finally { setLoading(false) }
  }

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {})
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
    resetUnread()
  }

  const markOne = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {})
    setNotifications((ns) => ns.map((n) => n._id === id ? { ...n, isRead: true } : n))
    setUnread((u) => Math.max(0, u-1))
  }

  const TYPE_ICON = { status_changed:'🔄', assigned:'📋', comment:'💬', upvote_escalation:'🚨', sla_breach:'⏰', system:'🔔' }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px', minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Notifications</h1>
          {unread > 0 && <p style={{ fontSize: '13px', color: '#2563eb', margin: '4px 0 0', fontWeight: '600' }}>{unread} unread</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>Mark all read</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(8)].map((_,i) => <Skeleton key={i} height="80px" radius="12px" />)}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" message="All caught up!" subMessage="No notifications yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => (
            <div key={n._id}
              style={{
                background: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start',
                border: n.isRead ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                boxShadow: n.isRead ? '0 1px 2px rgba(0,0,0,0.05)' : '0 4px 6px -1px rgba(59, 130, 246, 0.1)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onClick={() => !n.isRead && markOne(n._id)}>
              <span style={{ fontSize: '20px' }}>{TYPE_ICON[n.type] || '🔔'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', lineHeight: '1.5', margin: '0 0 6px', color: n.isRead ? '#64748b' : '#1e293b', fontWeight: n.isRead ? '400' : '500' }}>
                  {n.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                  {n.issueId && (
                    <Link to={`/issues/${n.issueId._id || n.issueId}`} style={{ fontSize: '12px', color: '#2563eb', fontWeight: '500', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                      View issue →
                    </Link>
                  )}
                </div>
              </div>
              {!n.isRead && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px' }} />}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            onClick={() => setPage(p => Math.max(1, p-1))} 
            disabled={page === 1} 
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', color: '#64748b', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Page {page} of {pages}</span>
          <button 
            onClick={() => setPage(p => Math.min(pages, p+1))} 
            disabled={page >= pages} 
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', color: '#64748b', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.5 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
