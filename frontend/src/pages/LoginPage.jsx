import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartIcon } from '@heroicons/react/24/solid'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function LoginPage() {
  const { sendOTP, verifyOTP, adminLogin } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [mode, setMode]           = useState('donor')  // 'donor' | 'admin'
  const [step, setStep]           = useState('email')  // 'email' | 'otp'
  const [email, setEmail]         = useState('')
  const [otp, setOtp]             = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleDonorEmail(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendOTP(email)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOTPVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOTP(email, otp)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminLogin(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setStep('email')
    setError('')
    setEmail('')
    setOtp('')
    setPassword('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 dark:bg-black"
      style={{ background: dark ? undefined : 'linear-gradient(145deg, #f0f4ff 0%, #f5f5f7 50%, #f0f7ff 100%)' }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-xl text-[#8E8E93] hover:bg-white/60 dark:hover:bg-[#2C2C2E] transition-colors"
      >
        {dark ? <SunIcon className="w-5 h-5 text-[#FF9500]" /> : <MoonIcon className="w-5 h-5" />}
      </button>
      {/* Brand mark */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-[22px] bg-[#0071E3] flex items-center justify-center shadow-lg mb-4">
          <HeartIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">Asha</h1>
        <p className="text-[13px] text-[#8E8E93] mt-1">Donor Management · KPALS</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl rounded-[22px] shadow-lg border border-white/60 dark:border-[#3A3A3C] p-8">
        {/* Toggle */}
          <div className="flex bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-1 mb-6">
          {['donor', 'admin'].map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              {m === 'donor' ? 'Donor' : 'Admin'}
            </button>
          ))}
        </div>

        {/* Donor flow */}
        {mode === 'donor' && (
          <>
            {step === 'email' ? (
              <form onSubmit={handleDonorEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#AEAEB2] dark:placeholder-[#636366] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"
                  />
                </div>
                {error && <p className="text-sm text-[#FF3B30]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] active:bg-[#0064CC] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send Login Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTPVerify} className="space-y-4">
                <div>
                  <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mb-4">
                    We sent a 6-digit code to <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{email}</span>.
                  </p>
                  <label className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                    Login code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm text-center tracking-[0.35em] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"
                  />
                </div>
                {error && <p className="text-sm text-[#FF3B30]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] active:bg-[#0064CC] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp('') }}
                  className="w-full py-2 text-sm text-[#0071E3] hover:underline"
                >
                  Use a different email
                </button>
              </form>
            )}
          </>
        )}

        {/* Admin flow */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@kpals.org"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#AEAEB2] dark:placeholder-[#636366] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#AEAEB2] dark:placeholder-[#636366] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"
              />
            </div>
            {error && <p className="text-sm text-[#FF3B30]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] active:bg-[#0064CC] transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-xs text-[#AEAEB2] dark:text-[#636366]">© {new Date().getFullYear()} KPALS · Asha v1.0</p>
    </div>
  )
}
