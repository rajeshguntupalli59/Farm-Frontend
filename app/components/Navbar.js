'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLang } from '../../lib/lang'
import { logout, getUser } from '../../lib/auth'

const NAV_ITEMS = [
  { key: 'dashboard',    href: '/dashboard',  icon: '🏠', roles: ['OWNER','MANAGER','EMPLOYEE'] },
  { key: 'products',     href: '/products',   icon: '📦', roles: ['OWNER','MANAGER','EMPLOYEE'] },
  { key: 'animals',      href: '/animals',    icon: '🐐', roles: ['OWNER','MANAGER','EMPLOYEE'] },
  { key: 'orders',       href: '/orders',     icon: '🛒', roles: ['OWNER','MANAGER','EMPLOYEE'] },
  { key: 'customers',    href: '/customers',  icon: '👥', roles: ['OWNER','MANAGER'] },
  { key: 'inventory',    href: '/inventory',  icon: '🌾', roles: ['OWNER','MANAGER'] },
  { key: 'healthRecords',href: '/health',     icon: '💉', roles: ['OWNER','MANAGER'] },
  { key: 'breeding',     href: '/breeding',   icon: '🐣', roles: ['OWNER','MANAGER'] },
  { key: 'expenses',     href: '/expenses',   icon: '💸', roles: ['OWNER','MANAGER'] },
  { key: 'tasks',        href: '/tasks',      icon: '✅', roles: ['OWNER','MANAGER','EMPLOYEE'] },
  { key: 'attendance',   href: '/attendance', icon: '📋', roles: ['OWNER','MANAGER'] },
  { key: 'reports',      href: '/reports',    icon: '📊', roles: ['OWNER'] },
  { key: 'categories',   href: '/categories', icon: '🗂️',  roles: ['OWNER'] },
  { key: 'employees',    href: '/employees',  icon: '👷', roles: ['OWNER'] },
  { key: 'delivery',     href: '/delivery',   icon: '🚚', roles: ['OWNER','MANAGER'] },
  { key: 'catalog',      href: '/catalog',    icon: '🌐', roles: ['OWNER','MANAGER','EMPLOYEE'] },
]

export default function Navbar() {
  const { t, lang, toggleLang } = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = getUser()

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const roleColor = user.role === 'OWNER' ? '#7c3aed' : user.role === 'MANAGER' ? '#1d4ed8' : '#166534'

  return (
    <>
      {/* Top bar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        background: '#166534', height: 56,
        display: 'flex', alignItems: 'center',
        padding: '0 1rem', gap: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        {/* Hamburger */}
        <button onClick={() => setMenuOpen(o => !o)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 22, color: '#fff', padding: '4px 8px', borderRadius: 6,
          lineHeight: 1
        }}>☰</button>

        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>
          🐐 {t.appName}
        </span>

        <div style={{ flex: 1 }} />

        {/* Language toggle */}
        <button onClick={toggleLang} style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: 6, padding: '4px 12px',
          cursor: 'pointer', fontSize: 13, fontWeight: 600
        }}>
          {lang === 'en' ? 'తె' : 'EN'}
        </button>

        {/* User badge */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '4px 10px',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: roleColor === '#7c3aed' ? '#c4b5fd' : roleColor === '#1d4ed8' ? '#93c5fd' : '#86efac'
          }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{user.role}</span>
        </div>

        <button onClick={handleLogout} style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', borderRadius: 6, padding: '4px 10px',
          cursor: 'pointer', fontSize: 12, fontWeight: 600
        }}>
          {t.logout}
        </button>
      </header>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 56, left: 0, bottom: 0, zIndex: 35,
        width: menuOpen ? 220 : 0,
        background: '#fff',
        boxShadow: menuOpen ? '2px 0 12px rgba(0,0,0,0.1)' : 'none',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        borderRight: '1px solid #e5e7eb'
      }}>
        <nav style={{ padding: '0.75rem 0', whiteSpace: 'nowrap' }}>
          {visibleItems.map(item => {
            const active = pathname === item.href
            return (
              <a
                key={item.key}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.7rem 1.25rem',
                  background: active ? '#f0fdf4' : 'transparent',
                  borderLeft: active ? '3px solid #166534' : '3px solid transparent',
                  color: active ? '#166534' : '#374151',
                  fontWeight: active ? 700 : 500,
                  fontSize: 14, textDecoration: 'none',
                  transition: 'background 0.1s'
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{t[item.key]}</span>
              </a>
            )
          })}
        </nav>
      </aside>

      {/* Overlay to close menu */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30,
            background: 'rgba(0,0,0,0.2)'
          }}
        />
      )}
    </>
  )
}
