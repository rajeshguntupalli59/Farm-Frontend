'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../lib/api'
import { useLang } from '../lib/lang'

export default function WelcomePage() {
  const router = useRouter()
  const { t, lang, toggleLang } = useLang()
  const [screen, setScreen] = useState('checking')
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
    setLoading(true); setError('')
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
        <div style={{ fontSize: 48 }}>🐐</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Top nav bar */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 2rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🐐</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#14532d' }}>{t.appName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleLang} style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            color: '#166534', borderRadius: 8, padding: '6px 16px',
            cursor: 'pointer', fontSize: 13, fontWeight: 700
          }}>
            {lang === 'en' ? 'తెలుగు' : 'English'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>

        {screen === 'welcome' ? (
          <div style={{ width: '100%', maxWidth: 960 }}>
            {/* Hero text */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ fontSize: 42, fontWeight: 900, color: '#14532d', margin: 0, lineHeight: 1.15 }}>
                Welcome to {t.appName}
              </h1>
              <p style={{ color: '#6b7280', fontSize: 17, marginTop: 12 }}>
                Farm management & customer portal — all in one place
              </p>
            </div>

            {/* Two cards side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: 780, margin: '0 auto' }}>

              {/* Customer card */}
              <div style={{
                background: '#fff', borderRadius: 20, padding: '2.5rem',
                border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: '0 0 8px' }}>Customer Portal</h2>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                  Browse fresh farm products, place orders, and track deliveries — register with just your phone number.
                </p>
                <button
                  onClick={() => router.push('/customer')}
                  style={{
                    width: '100%', background: '#166534', color: '#fff',
                    border: 'none', borderRadius: 12, padding: '14px',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Customer Login →
                </button>
              </div>

            </div>

            {/* Feature highlights */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
              {[
                { icon: '🐐', text: 'Animal & Livestock' },
                { icon: '📦', text: 'Products & Orders' },
                { icon: '🌾', text: 'Inventory & Feed' },
                { icon: '💉', text: 'Health Records' },
                { icon: '🚚', text: 'Delivery Tracking' },
                { icon: '📊', text: 'Reports & Analytics' },
              ].map(f => (
                <div key={f.text} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 10, padding: '8px 16px', fontSize: 13,
                  color: '#374151', fontWeight: 500
                }}>
                  <span>{f.icon}</span><span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '1.25rem', color: '#9ca3af', fontSize: 13, borderTop: '1px solid #f3f4f6' }}>
        KRUTHIK FARM © 2025 · India
        <span style={{ margin: '0 12px' }}>·</span>
        <a href="/admin" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 12 }}>Staff</a>
      </footer>
    </div>
  )
}
