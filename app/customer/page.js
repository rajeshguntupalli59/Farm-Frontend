'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { customerLogin, sendOtp, verifyOtp } from '../../lib/api'

const RESEND_WAIT = 30

export default function CustomerAuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState('login')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('customerToken')) {
      router.replace('/customer/portal')
    }
  }, [router])

  useEffect(() => {
    if (countdown <= 0) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [countdown])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const switchTab = (t) => { setTab(t); setStep(1); setError(''); setOtp(''); setInfo('') }

  // LOGIN — just phone, no OTP
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.phone.trim()) return setError('Enter your phone number')
    setLoading(true)
    try {
      const res = await customerLogin({ phone: form.phone.trim() })
      localStorage.setItem('customerToken', res.data.token)
      localStorage.setItem('customerData', JSON.stringify(res.data.customer))
      router.push('/customer/portal')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // REGISTER step 1 — send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return setError('Enter a valid 10-digit Indian mobile number')
    if (!form.name.trim()) return setError('Name is required')
    setLoading(true)
    try {
      await sendOtp(form.phone.trim())
      setStep(2)
      setInfo(`OTP sent to ${form.phone}`)
      setCountdown(RESEND_WAIT)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // REGISTER step 2 — verify OTP
  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.length !== 6) return setError('Enter the 6-digit OTP')
    setLoading(true)
    try {
      const res = await verifyOtp({ phone: form.phone.trim(), code: otp.trim(), name: form.name.trim(), address: form.address.trim() })
      localStorage.setItem('customerToken', res.data.token)
      localStorage.setItem('customerData', JSON.stringify(res.data.customer))
      router.push('/customer/portal')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setError(''); setOtp('')
    setLoading(true)
    try {
      await sendOtp(form.phone.trim())
      setInfo('New OTP sent!')
      setCountdown(RESEND_WAIT)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐐</div>
          <h1 className="text-2xl font-bold text-green-900">Kruthik Farm</h1>
          <p className="text-green-700 mt-1">కృతిక్ ఫార్మ్ · Customer Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-100">
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold transition ${tab === t ? 'text-green-800 border-b-2 border-green-700 bg-green-50' : 'text-gray-500'}`}>
                {t === 'login' ? 'Login' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* LOGIN — phone only */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="10-digit mobile number" maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-60 transition">
                {loading ? 'Logging in...' : 'Login →'}
              </button>
            </form>
          )}

          {/* REGISTER step 1 — details + phone */}
          {tab === 'register' && step === 1 && (
            <form onSubmit={handleSendOtp} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="10-digit mobile number" maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400">(optional)</span></label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Village / town"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-60 transition">
                {loading ? 'Sending OTP...' : 'Get OTP to Verify →'}
              </button>
            </form>
          )}

          {/* REGISTER step 2 — OTP */}
          {tab === 'register' && step === 2 && (
            <form onSubmit={handleVerify} className="p-6 space-y-4">
              <div className="text-center">
                <div className="text-3xl mb-2">📱</div>
                <p className="text-gray-700 font-medium">Verify your number</p>
                <p className="text-gray-500 text-sm mt-1">
                  OTP sent to <span className="font-semibold text-gray-700">{form.phone}</span>
                  {' · '}<button type="button" onClick={() => { setStep(1); setError('') }} className="text-green-700 underline text-xs">Change</button>
                </p>
              </div>
              <input type="number" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))}
                placeholder="6-digit OTP" autoFocus
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500" />
              {info && !error && <p className="text-green-700 text-sm text-center">{info}</p>}
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-60 transition">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
              <button type="button" onClick={handleResend} disabled={countdown > 0 || loading}
                className="w-full text-sm text-center py-1 disabled:text-gray-400 text-green-700">
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Need help? Call <a href="tel:8897132032" className="text-green-700 font-medium">8897132032</a>
        </p>
      </div>
    </div>
  )
}
