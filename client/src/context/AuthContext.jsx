import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('civicpulse_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const setSession = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('civicpulse_user', JSON.stringify(userData))
    setUser(userData)
  }

  const clearSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('civicpulse_user')
    setUser(null)
  }

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
        localStorage.setItem('civicpulse_user', JSON.stringify(data.user))
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData)
    return data
  }

  const verifyOTP = async (userId, otp) => {
    const { data } = await api.post('/auth/verify-otp', { userId, otp })
    setSession(data.accessToken, data.user)
    return data
  }

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setSession(data.accessToken, data.user)
    return data
  }

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    clearSession()
  }, [])

  const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  }

  const resetPassword = async (email, otp, password) => {
    const { data } = await api.patch('/auth/reset-password', { email, otp, password })
    return data
  }

  const resendOTP = async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email })
    return data
  }

  const isAdmin = user?.role === 'admin'
  const isOfficer = user?.role === 'officer' || user?.role === 'admin'
  const isCitizen = !!user

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isOfficer, isCitizen, register, verifyOTP, login, logout, forgotPassword, resetPassword, resendOTP, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
