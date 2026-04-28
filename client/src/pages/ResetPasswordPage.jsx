import { useState } from 'react'
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Skeleton from '../components/Skeleton';

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function ResetPasswordPage() {
  const { resetPassword, forgotPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const email = location.state?.email

  const [otp, setOtp] = useState('')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    if (otp.length !== 6) return setError('OTP must be 6 digits')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    setLoading(true)
    try {
      await resetPassword(email, otp, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed — invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await forgotPassword(email)
      alert('A new OTP has been sent to your email.')
    } catch (err) {
      alert('Failed to resend OTP.')
    }
  }

  if (!email) return <Navigate to="/forgot-password" replace />

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 transform transition-all">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-2xl text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-orange-500/30">
            {done ? '✅' : '🔒'}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{done ? 'Password reset!' : 'Set new password'}</h1>
          {done && <p className="text-sm text-slate-500 mt-2">Redirecting to login...</p>}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-3 animate-slide-up">
            <span className="text-red-500 text-lg mt-[-2px]">⚠</span> {error}
          </div>
        )}

        {!done && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700">6-Digit Reset Code</label>
                <button type="button" onClick={handleResend} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Resend code
                </button>
              </div>
              <input 
                type="text" 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 font-mono tracking-widest text-center text-lg" 
                placeholder="000000" 
                maxLength={6}
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <div className="relative">
                <input 
                  type={showPw ? "text" : "password"} 
                  className="w-full h-11 pl-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden" 
                  placeholder="Min 8 chars" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
              <div className="relative">
                <input 
                  type={showConfirmPw ? "text" : "password"} 
                  className="w-full h-11 pl-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden" 
                  placeholder="••••••••" 
                  value={confirm} 
                  onChange={(e) => setConfirm(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                >
                  {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full h-11 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-70">
              {loading ? <Skeleton width="80px" height="12px" radius="4px" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
