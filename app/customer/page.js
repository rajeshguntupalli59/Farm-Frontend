'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { customerLogin, sendOtp, verifyOtp } from '../../lib/api'
import { BUSINESS_PHONE } from '../../lib/constants'

const RESEND_WAIT = 30

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const BG_ICONS = [
  // left strip
  { icon: '🐐', top: '2%',   left: '1%',   size: 54, rotate: -15 },
  { icon: '🌱', top: '8%',   left: '6%',   size: 30, rotate: 10  },
  { icon: '🐓', top: '14%',  left: '0%',   size: 40, rotate: -8  },
  { icon: '🥕', top: '20%',  left: '5%',   size: 34, rotate: 20  },
  { icon: '🐑', top: '27%',  left: '0%',   size: 46, rotate: 8   },
  { icon: '🌽', top: '34%',  left: '4%',   size: 42, rotate: -20 },
  { icon: '🐄', top: '41%',  left: '0%',   size: 52, rotate: 5   },
  { icon: '🥬', top: '48%',  left: '5%',   size: 36, rotate: -15 },
  { icon: '🐇', top: '55%',  left: '0%',   size: 40, rotate: -10 },
  { icon: '🍅', top: '62%',  left: '4%',   size: 34, rotate: 14  },
  { icon: '🐔', top: '69%',  left: '0%',   size: 44, rotate: -5  },
  { icon: '🥦', top: '76%',  left: '5%',   size: 38, rotate: 18  },
  { icon: '🐐', top: '83%',  left: '0%',   size: 52, rotate: 12  },
  { icon: '🌾', top: '90%',  left: '4%',   size: 44, rotate: -12 },
  { icon: '🐾', top: '96%',  left: '1%',   size: 30, rotate: 0   },
  // right strip
  { icon: '🐑', top: '2%',   right: '1%',  size: 46, rotate: 12  },
  { icon: '🍃', top: '8%',   right: '6%',  size: 30, rotate: -15 },
  { icon: '🥕', top: '14%',  right: '0%',  size: 36, rotate: 20  },
  { icon: '🐐', top: '21%',  right: '2%',  size: 54, rotate: -10 },
  { icon: '🫑', top: '28%',  right: '5%',  size: 34, rotate: -18 },
  { icon: '🐓', top: '35%',  right: '0%',  size: 42, rotate: 8   },
  { icon: '🍆', top: '42%',  right: '4%',  size: 38, rotate: -8  },
  { icon: '🐄', top: '49%',  right: '0%',  size: 52, rotate: 6   },
  { icon: '🌿', top: '56%',  right: '5%',  size: 32, rotate: 15  },
  { icon: '🐇', top: '63%',  right: '0%',  size: 40, rotate: -12 },
  { icon: '🥑', top: '70%',  right: '4%',  size: 34, rotate: 20  },
  { icon: '🌾', top: '77%',  right: '0%',  size: 46, rotate: -6  },
  { icon: '🐔', top: '84%',  right: '5%',  size: 40, rotate: 10  },
  { icon: '🥦', top: '91%',  right: '0%',  size: 38, rotate: -15 },
  { icon: '🌱', top: '97%',  right: '3%',  size: 28, rotate: 5   },
  // top row
  { icon: '🥚', top: '1%',   left: '20%',  size: 28, rotate: -10 },
  { icon: '🐾', top: '2%',   left: '35%',  size: 26, rotate: 15  },
  { icon: '🌻', top: '1%',   left: '55%',  size: 32, rotate: -5  },
  { icon: '🍋', top: '2%',   left: '70%',  size: 28, rotate: 12  },
  // bottom row
  { icon: '🌻', bottom: '2%', left: '20%', size: 32, rotate: 8   },
  { icon: '🥚', bottom: '1%', left: '38%', size: 28, rotate: -12 },
  { icon: '🍋', bottom: '2%', left: '58%', size: 30, rotate: 18  },
  { icon: '🐾', bottom: '1%', left: '74%', size: 26, rotate: -8  },
]

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
  const [greeting] = useState(getGreeting())
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%)' }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fade-up { animation: slideUp 0.45s ease both; }
        .fade-up-delay { animation: slideUp 0.45s ease 0.1s both; }
      `}</style>

      {/* Top bar */}
      <header style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', borderBottom: '1px solid #bbf7d0', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🐐</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#14532d' }}>KRUTHIK FARM</span>
        </div>
        <span />
      </header>

      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', overflow: 'hidden' }}>

        {/* Decorative background icons */}
        {BG_ICONS.map((item, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: item.top, left: item.left, right: item.right, bottom: item.bottom,
            fontSize: item.size, opacity: 0.25,
            transform: `rotate(${item.rotate}deg)`,
            pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
          }}>{item.icon}</div>
        ))}

        {/* Branding */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#166534', fontWeight: 600, marginBottom: 14, letterSpacing: 1 }}>
            {greeting} 👋
          </div>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🐐</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#14532d', letterSpacing: 1 }}>KRUTHIK FARM</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>కృతిక్ ఫార్మ్</div>
        </div>

        {/* Form card */}
        <div className="fade-up-delay" style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', width: '100%', maxWidth: 420 }}>
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
                  Need help?{' '}
                  <a href={`tel:${BUSINESS_PHONE}`} style={{ color: '#166534', fontWeight: 700, textDecoration: 'none' }}>
                    📞 {BUSINESS_PHONE}
                  </a>
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

      <footer style={{ textAlign: 'center', padding: '1.25rem', color: '#9ca3af', fontSize: 13 }}>
        KRUTHIK FARM © 2025 · India
        <span style={{ margin: '0 10px' }}>·</span>
        <a href="/admin" style={{ color: '#d1d5db', fontSize: 12, textDecoration: 'none' }}>Staff Login</a>
      </footer>
    </div>
  )
}
