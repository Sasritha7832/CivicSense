import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Only connect socket when user is authenticated
    if (!user) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnected(false)
      return
    }

    const token = localStorage.getItem('token')

    // Extract base URL from VITE_API_URL (remove /api if present) or default to '/'
    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '/';
    
    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    const socket = socketRef.current

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('issue:new', (data) => {
      if (user?.role === 'admin') {
        toast.success(`🏙️ New issue: ${data.title}`, { duration: 5000, icon: '📍' })
      }
    })

    socket.on('issue:status_changed', (data) => {
      toast.custom((t) => (
        <div
          className={`${t.visible ? 'animate-slide-up' : 'opacity-0'} max-w-xs w-full bg-gray-800 border border-gray-700 shadow-lg rounded-2xl p-4`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{data.status === 'Resolved' ? '✅' : data.status === 'Rejected' ? '❌' : '🔄'}</span>
            <div>
              <p className="font-semibold text-white text-sm">Status Updated</p>
              <p className="text-gray-400 text-xs mt-0.5">{data.title} → <span className="capitalize text-primary-400">{data.status?.replace('_',' ')}</span></p>
            </div>
          </div>
        </div>
      ), { duration: 6000 })
      setUnreadCount((n) => n + 1)
    })

    socket.on('issue:assigned', (data) => {
      toast.success(`📋 Assigned: ${data.title}`, { duration: 6000 })
      setUnreadCount((n) => n + 1)
    })

    socket.on('notification:push', (data) => {
      toast(data.message || data.title || 'New notification', { icon: '🔔', duration: 5000 })
      setUnreadCount((n) => n + 1)
    })

    // Join ward room if user has one
    if (user?.ward) socket.emit('join:ward', user.ward)

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?._id])

  const resetUnread = () => setUnreadCount(0)

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, unreadCount, resetUnread }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
