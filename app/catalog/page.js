'use client'
import { useState, useEffect } from 'react'
import { getPublicProducts, getPublicAnimals, placePublicOrder } from '../../lib/api'
import { useLang } from '../../lib/lang'
import { BUSINESS_PHONE } from '../../lib/constants'

const ORDER_EMPTY = { customerName: '', customerPhone: '', quantity: 1, notes: '' }

export default function CatalogPage() {
  const { t, lang, toggleLang } = useLang()
  const [products, setProducts] = useState([])
  const [animals, setAnimals] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Online order modal state
  const [orderModal, setOrderModal] = useState(null) // null or product object
  const [orderForm, setOrderForm] = useState(ORDER_EMPTY)
  const [orderSaving, setOrderSaving] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Track order
  const [trackInput, setTrackInput] = useState('')
  const handleTrack = (e) => {
    e.preventDefault()
    const code = trackInput.trim().toUpperCase()
    if (code) window.location.href = `/track/${code}`
  }

  useEffect(() => {
    Promise.all([
      getPublicProducts().then(r => {
        const available = r.data.products.filter(p => p.isAvailable)
        setProducts(available)
        const cats = {}
        available.forEach(p => {
          const key = p.category?.parent?.name || p.category?.name || 'Other'
          if (!cats[key]) cats[key] = { emoji: p.category?.parent?.emoji || p.category?.emoji || '📦', name: key }
        })
        setCategories(Object.values(cats))
      }),
      getPublicAnimals({ status: 'AVAILABLE' }).then(r => setAnimals(r.data.animals))
    ]).finally(() => setLoading(false))
  }, [])

  const whatsapp = (item) => {
    const msg = encodeURIComponent(`Hi, I'm interested in ${item.name} at ₹${item.price}/${item.unit || 'piece'}`)
    window.open(`https://wa.me/91${BUSINESS_PHONE}?text=${msg}`)
  }

  const call = () => window.open(`tel:${BUSINESS_PHONE}`)

  const openOrderModal = (product) => {
    setOrderModal(product)
    setOrderForm(ORDER_EMPTY)
    setOrderSuccess(false)
  }

  const closeOrderModal = () => {
    setOrderModal(null)
    setOrderSuccess(false)
  }

  const handlePlaceOrder = async () => {
    if (!orderForm.customerName.trim() || !orderForm.customerPhone.trim()) return
    setOrderSaving(true)
    try {
      await placePublicOrder({
        customerName: orderForm.customerName.trim(),
        customerPhone: orderForm.customerPhone.trim(),
        productId: orderModal.id,
        quantity: Number(orderForm.quantity) || 1,
        notes: orderForm.notes.trim() || undefined,
      })
      setOrderSuccess(true)
      setTimeout(() => closeOrderModal(), 2500)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setOrderSaving(false)
    }
  }

  const estimatedTotal = orderModal
    ? (Number(orderModal.price) || 0) * (Number(orderForm.quantity) || 1)
    : 0

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const catName = p.category?.parent?.name || p.category?.name || 'Other'
    const matchCat = activeCat === 'all' || catName === activeCat
    const matchSearch = !search || p.name.toLowerCase().includes(q) || (p.nameTelugu || '').includes(search)
    return matchCat && matchSearch
  })

  const filteredAnimals = animals.filter(a => {
    const q = search.toLowerCase()
    return (activeCat === 'all' || activeCat === '🐐 Animals') &&
      (!search || a.name.toLowerCase().includes(q))
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4' }}>

      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        padding: '1.5rem 1rem 1rem',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                🐐 {t.appName}
              </div>
              <div style={{ color: '#86efac', fontSize: 13, marginTop: 2 }}>{t.tagline}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={toggleLang} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700
              }}>
                {lang === 'en' ? 'తె' : 'EN'}
              </button>
              <button onClick={call} style={{
                background: '#22c55e', border: 'none', color: '#fff',
                borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700
              }}>
                📞 {t.callUs}
              </button>
            </div>
          </div>

          <input
            placeholder={`🔍 ${t.search}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.95)', border: 'none',
              borderRadius: 10, padding: '10px 16px', fontSize: 15
            }}
          />
        </div>
      </div>

      {/* Track Order Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0.75rem 1rem' }}>
          <form onSubmit={handleTrack} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', fontWeight: 600 }}>
              📦 {lang === 'te' ? 'ఆర్డర్ ట్రాక్' : 'Track Order'}:
            </span>
            <input
              value={trackInput}
              onChange={e => setTrackInput(e.target.value.toUpperCase())}
              placeholder={lang === 'te' ? 'ట్రాకింగ్ కోడ్ నమోదు చేయండి...' : 'Enter tracking code e.g. PBA1B2C3'}
              style={{
                flex: 1, border: '1px solid #d1d5db', borderRadius: 8,
                padding: '7px 12px', fontSize: 13, fontFamily: 'monospace',
                letterSpacing: 1, outline: 'none'
              }}
            />
            <button type="submit" style={{
              background: '#166534', color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap'
            }}>
              {lang === 'te' ? 'వెతుకు' : 'Track'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1rem' }}>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: '1rem' }}>
          {[{ name: t.all, emoji: '🌟' }, ...categories].map(cat => {
            const key = cat.name === t.all ? 'all' : cat.name
            const active = activeCat === key
            return (
              <button key={key} onClick={() => setActiveCat(key)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 24, border: '1px solid',
                borderColor: active ? '#166534' : '#d1d5db',
                background: active ? '#166534' : '#fff',
                color: active ? '#fff' : '#374151',
                cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap'
              }}>
                <span>{cat.emoji}</span><span>{cat.name}</span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', fontSize: 32 }}>🐐</div>
        ) : (
          <>
            {/* Products grid */}
            {filtered.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: '0.875rem' }}>
                  {t.products} ({filtered.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {filtered.map(p => (
                    <div key={p.id} style={{
                      background: '#fff', borderRadius: 14, overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb'
                    }}>
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: 130, background: '#f0fdf4',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48
                        }}>
                          {p.category?.emoji || '📦'}
                        </div>
                      )}
                      <div style={{ padding: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{lang === 'te' && p.nameTelugu ? p.nameTelugu : p.name}</div>
                            {lang === 'te' && p.nameTelugu && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.name}</div>}
                            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                              {p.category?.emoji} {lang === 'te' && p.category?.nameTelugu ? p.category.nameTelugu : p.category?.name}
                            </div>
                          </div>
                          <div style={{
                            fontSize: 18, fontWeight: 900, color: '#166534',
                            whiteSpace: 'nowrap', marginLeft: 8
                          }}>
                            ₹{p.price}<span style={{ fontSize: 12, fontWeight: 400 }}>/{p.unit}</span>
                          </div>
                        </div>
                        {(lang === 'te' && p.descTelugu ? p.descTelugu : p.description) && (
                          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                            {lang === 'te' && p.descTelugu ? p.descTelugu : p.description}
                          </p>
                        )}
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => whatsapp(p)} style={{
                            flex: 1, background: '#22c55e', color: '#fff',
                            border: 'none', borderRadius: 8, padding: '9px 6px', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}>
                            💬 {t.whatsapp}
                          </button>
                          <button onClick={() => openOrderModal(p)} style={{
                            flex: 1, background: '#166534', color: '#fff',
                            border: 'none', borderRadius: 8, padding: '9px 6px', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}>
                            🛒 {t.orderOnline}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Animals section */}
            {filteredAnimals.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: '0.875rem' }}>
                  🐐 {t.animals} ({filteredAnimals.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {filteredAnimals.map(a => (
                    <div key={a.id} style={{
                      background: '#fff', borderRadius: 14, overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb'
                    }}>
                      {a.photoUrl ? (
                        <img src={a.photoUrl} alt={a.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: 130, background: '#f0fdf4',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48
                        }}>
                          {a.type === 'GOAT' ? '🐐' : a.type === 'SHEEP' ? '🐑' : '🐓'}
                        </div>
                      )}
                      <div style={{ padding: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {lang === 'te' ? t[a.type.toLowerCase()] || a.type : a.type}
                              {a.breed && ` • ${a.breed}`}
                            </div>
                            {(a.age || a.weight) && (
                              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                                {a.age && `${a.age}`}{a.age && a.weight && ' • '}{a.weight && `${a.weight}kg`}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#166534', whiteSpace: 'nowrap', marginLeft: 8 }}>
                            ₹{a.price}
                          </div>
                        </div>
                        <button onClick={() => whatsapp({ ...a, unit: 'animal' })} style={{
                          width: '100%', background: '#22c55e', color: '#fff',
                          border: 'none', borderRadius: 8, padding: '9px', cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}>
                          💬 {t.whatsapp}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {filtered.length === 0 && filteredAnimals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
                <div style={{ fontSize: 56 }}>🌿</div>
                <p style={{ marginTop: 8, fontSize: 16 }}>{t.noProducts}</p>
              </div>
            )}
          </>
        )}

        {/* Contact footer */}
        <div style={{
          background: '#166534', borderRadius: 14, padding: '1.25rem',
          marginTop: '2rem', textAlign: 'center', color: '#fff'
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>🐐 {t.appName}</div>
          <div style={{ fontSize: 13, color: '#86efac', marginBottom: '1rem' }}>{t.contactUs}</div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={call} style={{
              background: '#fff', color: '#166534', border: 'none',
              borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14
            }}>📞 {t.callUs}</button>
            <button onClick={() => window.open(`https://wa.me/91${BUSINESS_PHONE}`)} style={{
              background: '#22c55e', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14
            }}>💬 WhatsApp</button>
          </div>
        </div>
      </div>

      {/* Online Order Modal */}
      {orderModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeOrderModal()}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#14532d' }}>🛒 {t.orderOnline}</h2>
              <button onClick={closeOrderModal} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>

            {orderSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>
                  {t.orderPlaced}
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
                  We will contact you shortly.
                </p>
              </div>
            ) : (
              <>
                {/* Product name — read-only */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    {t.product}
                  </label>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                    padding: '10px 12px', fontSize: 14, fontWeight: 700, color: '#166534',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span>{lang === 'te' && orderModal.nameTelugu ? orderModal.nameTelugu : orderModal.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280' }}>₹{orderModal.price}/{orderModal.unit}</span>
                  </div>
                </div>

                {/* Name */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    {t.yourName} *
                  </label>
                  <input
                    type="text"
                    value={orderForm.customerName}
                    onChange={e => setOrderForm(f => ({ ...f, customerName: e.target.value }))}
                    placeholder="Enter your name"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    {t.yourPhone} *
                  </label>
                  <input
                    type="tel"
                    value={orderForm.customerPhone}
                    onChange={e => setOrderForm(f => ({ ...f, customerPhone: e.target.value }))}
                    placeholder="9876543210"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Quantity + Estimated Total */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                      {t.quantity}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={orderForm.quantity}
                      onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Estimated Total
                    </label>
                    <div style={{
                      background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8,
                      padding: '10px 12px', fontSize: 16, fontWeight: 900, color: '#92400e'
                    }}>
                      ₹{estimatedTotal}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Notes ({t.optional})
                  </label>
                  <textarea
                    rows={2}
                    value={orderForm.notes}
                    onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Delivery address, special requests..."
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={closeOrderModal} style={{
                    flex: 1, background: '#f3f4f6', color: '#374151', border: 'none',
                    borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 600, fontSize: 14
                  }}>
                    {t.cancel}
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={orderSaving || !orderForm.customerName.trim() || !orderForm.customerPhone.trim()}
                    style={{
                      flex: 2, background: '#166534', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                      opacity: (orderSaving || !orderForm.customerName.trim() || !orderForm.customerPhone.trim()) ? 0.6 : 1
                    }}
                  >
                    {orderSaving ? t.saving : `🛒 ${t.placeOrder}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
