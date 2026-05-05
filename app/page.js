'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../lib/api'
import { useLang } from '../lib/lang'

export default function WelcomePage() {
  const router = useRouter()
  const { t, lang, toggleLang } = useLang()
  const [screen, setScreen] = useState('checking') // checking | welcome | staffLogin
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) { router.replace('/dashboard'); return }
    const customerToken = localStorage.getItem('customerToken')
    if (customerToken) { router.replace('/customer/portal'); return }
    setScreen('welcome')
  }, [router])

  const handleStaffLogin = async () => {
    if (!phone || !password) { setError('Phone and password required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await login({ phone, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.replace('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid phone or password')
    } finally { setLoading(false) }
  }

  if (screen === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#166534' }}>
        <div style={{ fontSize: 48 }}>🐐</div>
      </div>
    )
  }

  // ── WELCOME SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'welcome') {
    return (
      <div style={{
        minHeight: '100vh', background: '#166534',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', position: 'relative'
      }}>
        {/* Language toggle */}
        <button onClick={toggleLang} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: 20, padding: '6px 16px',
          cursor: 'pointer', fontSize: 14, fontWeight: 700
        }}>
          {lang === 'en' ? 'తె' : 'EN'}
        </button>

        {/* Logo & title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 72, marginBottom: 10 }}>🐐</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            {t.appName}
          </h1>
          <p style={{ color: '#86efac', fontSize: 14, marginTop: 6 }}>కృతిక్ ఫార్మ్ · Goat Farm</p>
        </div>

        {/* Customer button (white, primary) */}
        <button
          onClick={() => router.push('/customer')}
          style={{
            width: '100%', maxWidth: 400,
            background: '#fff', border: 'none', borderRadius: 16,
            padding: '18px 20px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            textAlign: 'left'
          }}
        >
          <span style={{ fontSize: 36 }}>🛒</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#14532d' }}>Customer Portal</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Browse products & view orders</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 24, color: '#166534' }}>›</span>
        </button>

        {/* Staff button (translucent) */}
        <button
          onClick={() => setScreen('staffLogin')}
          style={{
            width: '100%', maxWidth: 400,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 16, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', textAlign: 'left'
          }}
        >
          <span style={{ fontSize: 36 }}>🔑</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Farm Staff Login</div>
            <div style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>Owner · Manager · Employee</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 24, color: '#86efac' }}>›</span>
        </button>
      </div>
    )
  }

  // ── STAFF LOGIN SCREEN ──────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Back button */}
        <button onClick={() => { setScreen('welcome'); setError('') }} style={{
          background: 'none', border: 'none', color: '#166534',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0
        }}>
          ← Back
        </button>

        <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔑</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#14532d', margin: 0 }}>Staff Login</h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Owner · Manager · Employee</p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '0.75rem 1rem', fontSize: 14, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label>{t.phone}</label>
            <input
              type="tel" placeholder="9876543210"
              value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
              autoComplete="tel"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>{t.password}</label>
            <input
              type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={handleStaffLogin} disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: 16, borderRadius: 10 }}
          >
            {loading ? 'Logging in...' : t.loginBtn || 'Login'}
          </button>

          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: '1.5rem' }}>
            పశుబజార్ © 2025 • India
          </p>
        </div>
      </div>
    </div>
  )
}
