'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPublicProducts, placeCustomerOrder } from '../../../lib/api'

export default function CustomerShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [catFilter, setCatFilter] = useState('')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orderModal, setOrderModal] = useState(null) // product being ordered
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('customerToken')
    const data = localStorage.getItem('customerData')
    if (!token || !data) { router.replace('/customer'); return }
    setCustomer(JSON.parse(data))
    fetchProducts()
  }, [router])

  const fetchProducts = async () => {
    try {
      const res = await getPublicProducts()
      const available = (res.data.products || []).filter(p => p.isAvailable)
      setProducts(available)
      const seen = new Set()
      const cats = []
      available.forEach(p => {
        if (p.category && !seen.has(p.category.id)) { seen.add(p.category.id); cats.push(p.category) }
      })
      setCategories(cats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = catFilter ? products.filter(p => p.category?.id?.toString() === catFilter) : products

  const openOrder = (product) => {
    setOrderModal(product)
    setQty('1')
    setNote('')
    setSuccess(null)
  }

  const handlePlaceOrder = async () => {
    if (!qty || parseFloat(qty) <= 0) return
    setPlacing(true)
    try {
      await placeCustomerOrder({ productId: orderModal.id, quantity: parseFloat(qty), note: note.trim() || undefined })
      setSuccess(orderModal)
      setOrderModal(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order. Try again.')
    } finally {
      setPlacing(false)
    }
  }

  const total = orderModal ? (orderModal.price * (parseFloat(qty) || 0)).toFixed(2) : 0

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <p className="text-green-800 font-medium">Loading products...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/customer/portal')} className="text-green-300 text-sm mr-1">← Back</button>
              <span className="font-bold text-lg">🛒 Shop</span>
            </div>
            <p className="text-green-200 text-xs mt-0.5">{products.length} products available</p>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">Hi,</p>
            <p className="font-semibold text-sm">{customer?.name}</p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-2 px-4 py-3 max-w-2xl mx-auto">
            {[{ id: '', name: 'All', emoji: '🔹' }, ...categories].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatFilter(cat.id?.toString() || '')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${catFilter === (cat.id?.toString() || '') ? 'bg-green-700 text-white border-green-700' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="bg-green-700 text-white px-4 py-3 text-sm flex items-center justify-between max-w-2xl mx-auto mt-3 rounded-xl">
          <span>✅ Order placed for <strong>{success.name}</strong>! We'll confirm soon.</span>
          <button onClick={() => router.push('/customer/portal')} className="text-green-200 font-semibold ml-3 text-xs">View Orders</button>
        </div>
      )}

      {/* Products */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p>No products in this category</p>
          </div>
        ) : filtered.map(product => (
          <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {product.photoUrl && (
              <img src={product.photoUrl} alt={product.name} className="w-full h-44 object-cover" />
            )}
            {!product.photoUrl && (
              <div className="w-full h-28 bg-green-50 flex items-center justify-center text-5xl">
                {product.category?.emoji || '📦'}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-base">{product.name}</p>
                  {product.nameTelugu && <p className="text-gray-500 text-sm">{product.nameTelugu}</p>}
                  <p className="text-gray-400 text-xs mt-0.5">{product.category?.emoji} {product.category?.name}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xl font-bold text-green-800">₹{product.price}</p>
                  <p className="text-gray-400 text-xs">per {product.unit}</p>
                </div>
              </div>
              {product.description && <p className="text-gray-500 text-sm mt-2 mb-3">{product.description}</p>}
              <button
                onClick={() => openOrder(product)}
                className="w-full bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition"
              >
                🛒 Order Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setOrderModal(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto p-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">{orderModal.category?.emoji || '📦'}</span>
              <div>
                <p className="font-bold text-gray-900">{orderModal.name}</p>
                <p className="text-green-700 font-semibold">₹{orderModal.price} / {orderModal.unit}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity ({orderModal.unit})
              </label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                min="0.1"
                step="0.1"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Any special instructions..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="bg-green-50 rounded-xl p-4 mb-5 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-xs text-gray-400">Payment on delivery / via UPI</p>
              </div>
              <p className="text-2xl font-bold text-green-800">₹{total}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setOrderModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
                Cancel
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing || !qty || parseFloat(qty) <= 0}
                className="flex-2 flex-1 py-3 rounded-xl bg-green-700 text-white font-bold disabled:opacity-60 hover:bg-green-800 transition"
              >
                {placing ? 'Placing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
