'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { customerLogin, sendOtp, verifyOtp } from '../../lib/api'
import { BUSINESS_PHONE } from '../../lib/constants'

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
    if (localStorage.getItem('customerToken')) router.replace('/customer/portal')
  }, [router])

  useEffect(() => {
    if (countdown <= 0) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [countdown])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const switchTab = (t) => { setTab(t); setStep(1); setError(''); setOtp(''); setInfo('') }

  const handleLogin = async (e) => {
    e.preventDefault(); setError('')
    if (!form.phone.trim()) return setError('Enter your phone number')
    setLoading(true)
    try {
      const res = await customerLogin({ phone: form.phone.trim() })
      localStorage.setItem('customerToken', res.data.token)
      localStorage.setItem('customerData', JSON.stringify(res.data.customer))
      router.push('/customer/portal')
    } catch (err) {
      setError(err.response?.data?.message || 'Phone number not found. Please register first.')
    } finally { setLoading(false) }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault(); setError('')
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return setError('Enter a valid 10-digit Indian mobile number')
    if (!form.name.trim()) return setError('Name is required')
    setLoading(true)
    try {
      await sendOtp(form.phone.trim())
      setStep(2); setInfo(`OTP sent to ${form.phone}`); setCountdown(RESEND_WAIT)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.')
    } finally { setLoading(false) }
  }

  const handleVerify = async (e) => {
    e.preventDefault(); setError('')
    if (otp.length !== 6) return setError('Enter the 6-digit OTP')
    setLoading(true)
    try {
      const res = await verifyOtp({ phone: form.phone.trim(), code: otp.trim(), name: form.name.trim(), address: form.address.trim() })
      localStorage.setItem('customerToken', res.data.token)
      localStorage.setItem('customerData', JSON.stringify(res.data.customer))
      router.push('/customer/portal')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setError(''); setOtp(''); setLoading(true)
    try {
      await sendOtp(form.phone.trim()); setInfo('New OTP sent!'); setCountdown(RESEND_WAIT)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Top bar */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🐐</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#14532d' }}>KRUTHIK FARM</span>
        </div>
        <a href="/" style={{ fontSize: 13, color: '#166534', fontWeight: 600, textDecoration: 'none' }}>← Back to Home</a>
      </header>

      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 1000, width: '100%', margin: '0 auto', padding: '4rem 2rem', gap: '4rem', alignItems: 'center' }}>

        {/* Left — branding */}
        <div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#14532d', margin: '0 0 12px', lineHeight: 1.2 }}>
            Customer Portal
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7, marginBottom: 32 }}>
            Order fresh goat, sheep & farm products directly from KRUTHIK FARM. Register with your phone number — no passwords needed.
          </p>
          {[
            { icon: '🥩', text: 'Fresh meat & livestock' },
            { icon: '🚚', text: 'Home delivery available' },
            { icon: '💬', text: 'WhatsApp support' },
            { icon: '📱', text: 'Track your orders live' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
          <div style={{ marginTop: 32, padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: '#166534', fontWeight: 600, margin: 0 }}>
              📞 Need help? Call us at <a href="tel:${BUSINESS_PHONE}" style={{ color: '#166534' }}>${BUSINESS_PHONE}</a>
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
            {[['login', 'Login'], ['register', 'Create Account']].map(([key, label]) => (
              <button key={key} onClick={() => switchTab(key)} style={{
                flex: 1, padding: '16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: tab === key ? '#f0fdf4' : '#fff', border: 'none',
                borderBottom: tab === key ? '2px solid #166534' : '2px solid transparent',
                color: tab === key ? '#166534' : '#6b7280'
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {/* LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="10-digit mobile number" maxLength={10} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Logging in...' : 'Login →'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
                  New customer?{' '}
                  <button type="button" onClick={() => switchTab('register')} style={{ background: 'none', border: 'none', color: '#166534', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    Create account →
                  </button>
                </p>
              </form>
            )}

            {/* REGISTER step 1 */}
            {tab === 'register' && step === 1 && (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name *</label>
                  <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone Number *</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile number" maxLength={10} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Address <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Village / town" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Sending OTP...' : 'Get OTP →'}
                </button>
              </form>
            )}

            {/* REGISTER step 2 — OTP */}
            {tab === 'register' && step === 2 && (
              <form onSubmit={handleVerify}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
                  <p style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>Verify your number</p>
                  <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>
                    OTP sent to <strong style={{ color: '#374151' }}>{form.phone}</strong>{' · '}
                    <button type="button" onClick={() => { setStep(1); setError('') }} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Change</button>
                  </p>
                </div>
                <input type="number" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))}
                  placeholder="6-digit OTP" autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 22, textAlign: 'center', letterSpacing: 8, marginBottom: 16 }} />
                {info && !error && <p style={{ color: '#166534', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>{info}</p>}
                {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
                <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15, marginBottom: 12 }}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
                <button type="button" onClick={handleResend} disabled={countdown > 0 || loading}
                  style={{ width: '100%', background: 'none', border: 'none', color: countdown > 0 ? '#9ca3af' : '#166534', fontSize: 13, fontWeight: 600, cursor: countdown > 0 ? 'default' : 'pointer', padding: '6px' }}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '1.25rem', color: '#9ca3af', fontSize: 13, borderTop: '1px solid #f3f4f6' }}>
        KRUTHIK FARM © 2025 · India
      </footer>
    </div>
  )
}
