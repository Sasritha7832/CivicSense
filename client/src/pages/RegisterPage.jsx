import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function RegisterPage() {
  const { register, verifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  
  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (/(.)\1\1/.test(pwd)) score--;
    if (/(123|234|345|456|567|678|789|qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)/i.test(pwd)) score--;
    return Math.max(0, Math.min(score, 4));
  };

  const strength = calculateStrength(form.password);
  const strengthColors = ['#e2e8f0','#ef4444','#f59e0b','#22c55e','#16a34a'];
  const strengthLabels = ['','Weak','Fair','Good','Strong'];

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const defaultResendSecs = parseInt(import.meta.env.VITE_OTP_RESEND_SECONDS) || 60;
  const [countdown, setCountdown] = useState(defaultResendSecs);
  const otpInputs = useRef([]);

  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    
    setLoading(true);
    try {
      const res = await register(form);
      setUserId(res.userId);
      setStep(2);
      setCountdown(defaultResendSecs);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpInputs.current[idx+1].focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      otpInputs.current[idx-1].focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return setError('Enter all 6 digits');
    
    setLoading(true);
    try {
      await verifyOTP(userId, otpCode);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await resendOTP(form.email);
      setCountdown(defaultResendSecs);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 transform transition-all">
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-2xl text-white flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-lg shadow-orange-500/30">
            CP
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {step === 1 ? 'Create your account' : 'Check your email'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {step === 1 
              ? 'Join CivicPulse and help improve your community' 
              : `We sent a 6-digit code to ${form.email}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-3 animate-slide-up">
            <span className="text-red-500 text-lg mt-[-2px]">⚠</span> {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Full name</label>
                <input 
                  type="text" required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="John Doe"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <input 
                  type="email" required
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="you@example.com"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input 
                    type={showPw ? 'text' : 'password'} required
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="Create a strong password"
                    className="w-full h-11 pl-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden"
                  />
                  <button 
                    type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} 
                      className="flex-1 h-1.5 rounded-full transition-colors duration-300"
                      style={{ background: strength >= i ? strengthColors[strength] : '#e2e8f0' }}
                    />
                  ))}
                </div>
                {form.password && (
                  <span className="text-xs font-medium mt-1.5 block transition-colors" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Confirm password</label>
                <input 
                  type="password" required
                  value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})}
                  placeholder="Confirm your password"
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} 
              className="w-full h-11 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-70"
            >
              {loading ? <Skeleton width="80px" height="12px" radius="4px" /> : 'Create Account'}
            </button>
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-8">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => otpInputs.current[idx] = el}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={e => handleOtpChange(e.target.value, idx)}
                  onKeyDown={e => handleOtpKeyDown(e, idx)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              ))}
            </div>

            <button type="submit" disabled={loading} 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-70"
            >
              {loading ? <Skeleton width="80px" height="12px" radius="4px" /> : 'Verify Email'}
            </button>

            <p className="text-center text-sm text-slate-500">
              {countdown > 0 ? (
                <span>Resend code in <span className="font-medium text-slate-700">{countdown}s</span></span>
              ) : (
                <button type="button" onClick={handleResendOtp} 
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Resend code
                </button>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
