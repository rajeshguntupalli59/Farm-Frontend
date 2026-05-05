'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const ROLES = ['EMPLOYEE', 'MANAGER', 'OWNER']
const ROLE_COLOR = { OWNER: { bg: '#ede9fe', color: '#7c3aed' }, MANAGER: { bg: '#dbeafe', color: '#1d4ed8' }, EMPLOYEE: { bg: '#dcfce7', color: '#166534' } }

export default function EmployeesPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const isOwner = user?.role === 'OWNER'

  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'EMPLOYEE', salary: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchEmployees()
  }, [router])

  const fetchEmployees = async () => {
    try { const r = await getEmployees(); setEmployees(r.data.employees) }
    catch { router.push('/login') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setForm({ name: '', phone: '', password: '', role: 'EMPLOYEE', salary: '' }); setEditEmp(null); setShowAdd(true) }
  const openEdit = (emp) => { setForm({ name: emp.name, phone: emp.phone, password: '', role: emp.role, salary: emp.salary != null ? String(emp.salary) : '' }); setEditEmp(emp); setShowAdd(true) }

  const handleSave = async () => {
    if (!form.name || !form.phone || (!editEmp && !form.password)) return
    setSaving(true)
    try {
      if (editEmp) await updateEmployee(editEmp.id, { name: form.name, phone: form.phone, role: form.role, salary: form.salary !== '' ? form.salary : null })
      else await addEmployee({ ...form, salary: form.salary !== '' ? form.salary : undefined })
      setShowAdd(false)
      fetchEmployees()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await deleteEmployee(deleteId); setDeleteId(null); fetchEmployees() }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete') }
  }

  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)
  )

  if (loading) return <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}><span style={{ fontSize: 32 }}>🐐</span></div>

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            {t.employees} ({filtered.length})
          </h1>
          <button onClick={openAdd} className="btn-primary">+ {t.addEmployee}</button>
        </div>

        <input placeholder={`🔍 ${t.search}`} value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1.25rem' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {filtered.map(emp => {
            const rc = ROLE_COLOR[emp.role] || {}
            return (
              <div key={emp.id} style={{
                background: '#fff', borderRadius: 14, padding: '1rem 1.25rem',
                boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: rc.bg || '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: rc.color || '#166534', flexShrink: 0
                  }}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{emp.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>📱 {emp.phone}</div>
                    {emp.salary != null && (
                      <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginTop: 2 }}>
                        💰 ₹{emp.salary.toLocaleString('en-IN')}/month
                      </div>
                    )}
                  </div>
                  <span style={{ background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                    {emp.role}
                  </span>
                </div>
                {isOwner && emp.id !== user?.id && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(emp)} style={{
                      flex: 1, background: '#dbeafe', color: '#1d4ed8', border: 'none',
                      borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                    }}>✏️ {t.edit}</button>
                    <button onClick={() => setDeleteId(emp.id)} style={{
                      background: '#fee2e2', color: '#dc2626', border: 'none',
                      borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12
                    }}>🗑️</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                👷 {editEmp ? t.edit : t.addEmployee}
              </h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div><label>{t.name} *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div style={{ marginTop: '0.75rem' }}><label>{t.phone} *</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
            {!editEmp && <div style={{ marginTop: '0.75rem' }}><label>{t.password} *</label><input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} /></div>}
            <div style={{ marginTop: '0.75rem' }}><label>Salary ₹/month ({t.optional})</label><input type="number" value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))} placeholder="e.g. 12000" /></div>
            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.role}</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {ROLES.map(r => (
                  <button key={r} onClick={() => setForm(f => ({...f, role: r}))} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: '1px solid',
                    borderColor: form.role === r ? '#166534' : 'var(--gray-200)',
                    background: form.role === r ? '#166534' : '#fff',
                    color: form.role === r ? '#fff' : 'var(--gray-700)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}>{r}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? t.saving : t.save}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{t.deleteConfirm}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setDeleteId(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleDelete} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 700 }}>{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
