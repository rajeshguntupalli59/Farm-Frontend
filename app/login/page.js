'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../../lib/api'
import { useLang } from '../../lib/lang'

export default function LoginPage() {
  const router = useRouter()
  const { t, lang, toggleLang } = useLang()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/dashboard')
  }, [router])

  const handleLogin = async () => {
    if (!phone || !password) { setError('Phone and password required'); return }
    try {
      setLoading(true)
      setError('')
      const res = await login({ phone, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Language toggle */}
        <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
          <button onClick={toggleLang} style={{
            background: '#166534', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
            fontSize: 13, fontWeight: 700
          }}>
            {lang === 'en' ? 'తెలుగు' : 'English'}
          </button>
        </div>

        <div style={{
          background: '#fff', borderRadius: 20, padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🐐</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#14532d', letterSpacing: '-0.5px' }}>
              {t.appName}
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{t.tagline}</p>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', borderRadius: 8,
              padding: '0.75rem 1rem', fontSize: 14, marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label>{t.phone}</label>
            <input
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="tel"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>{t.password}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: 16, borderRadius: 10 }}
          >
            {loading ? (t.loggingIn || 'Logging in...') : (t.loginBtn || t.login || 'Login')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>పశుబజార్ © 2025 • India</p>
            <a href="/customer" style={{
              display: 'inline-block', background: '#f0fdf4',
              border: '1px solid #86efac', color: '#166534',
              borderRadius: 8, padding: '8px 20px',
              fontSize: 14, fontWeight: 600, textDecoration: 'none'
            }}>
              🛍️ Customer Login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
