'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../../lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) router.replace('/dashboard')
  }, [router])

  const handleLogin = async () => {
    if (!phone || !password) { setError('Phone and password required'); return }
    setLoading(true); setError('')
    try {
      const res = await login({ phone, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.replace('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 400, width: '100%', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔑</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#14532d' }}>Staff Login</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>Owner · Manager · Employee</p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Phone</label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none' }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Logging in...' : 'Login to Dashboard →'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← Back to main site</a>
        </div>
      </div>
    </div>
  )
}
