import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Skeleton from '../components/Skeleton';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      navigate('/reset-password', { state: { email } })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 transform transition-all">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-2xl text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-orange-500/30">
            🔑
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Forgot password?</h1>
          <p className="text-sm text-slate-500 mt-2">
            Enter your email and we'll send you a 6-digit reset code
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-3 animate-slide-up">
            <span className="text-red-500 text-lg mt-[-2px]">⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400" 
              placeholder="you@example.com" autoFocus />
          </div>
          <button type="submit" disabled={loading} className="w-full h-11 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-70">
            {loading ? <Skeleton width="60px" height="12px" radius="4px" /> : 'Send reset code'}
          </button>
          <Link to="/login" className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-6">
            ← Back to login
          </Link>
        </form>
      </div>
    </div>
  )
}
