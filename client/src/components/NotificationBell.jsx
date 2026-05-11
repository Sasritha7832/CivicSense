import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
  const { unreadCount, clearUnread } = useSocket()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications?limit=10')
      setNotifications(res.data.notifications || [])
    } catch {}
    setLoading(false)
  }

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open) {
      fetchNotifications()
      clearUnread()
    }
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all duration-200"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse-glow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card p-0 overflow-hidden animate-fade-in z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm">Notifications</h3>
            <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300">
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className={`p-4 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${!n.isRead ? 'bg-primary-950/30' : ''}`}>
                  <div className="flex gap-3">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-400 mt-1 flex-shrink-0" />}
                    <div className={!n.isRead ? '' : 'ml-5'}>
                      <p className="text-sm text-gray-200 leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                      {n.issueId && (
                        <Link
                          to={`/issues/${n.issueId._id || n.issueId}`}
                          className="text-xs text-primary-400 hover:underline mt-1 block"
                          onClick={() => setOpen(false)}
                        >
                          View Issue →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-800">
            <Link to="/notifications" className="text-xs text-center text-primary-400 hover:text-primary-300 block" onClick={() => setOpen(false)}>
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
