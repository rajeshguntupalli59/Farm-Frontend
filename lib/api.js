import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const customerApi = axios.create({ baseURL: API_URL })

customerApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('customerToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// AUTH
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)

// EMPLOYEES
export const getEmployees = () => api.get('/employees')
export const addEmployee = (data) => api.post('/employees', data)
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data)
export const deleteEmployee = (id) => api.delete(`/employees/${id}`)

// DASHBOARD
export const getDashboard = () => api.get('/dashboard')

// CUSTOMERS — staff
export const getCustomers = () => api.get('/customers')
export const addCustomer = (data) => api.post('/customers', data)
export const getCustomerById = (id) => api.get(`/customers/${id}`)

// CUSTOMERS — auth (public)
export const customerLogin = (data) => api.post('/customers/login', data)
export const sendOtp = (phone) => api.post('/customers/send-otp', { phone })
export const verifyOtp = (data) => api.post('/customers/verify-otp', data)
// CUSTOMERS — self-service (customer token)
export const getMyOrders = () => customerApi.get('/customers/me/orders')
export const placeCustomerOrder = (data) => customerApi.post('/customers/me/orders', data)

// ORDERS
export const getOrders = (params) => api.get('/orders', { params })
export const createOrder = (data) => api.post('/orders', data)
export const getOrderById = (id) => api.get(`/orders/${id}`)
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data)

// INVENTORY
export const getInventory = (params) => api.get('/inventory', { params })
export const addInventoryItem = (data) => api.post('/inventory', data)
export const updateInventoryStock = (id, data) => api.put(`/inventory/${id}`, data)
export const deleteInventoryItem = (id) => api.delete(`/inventory/${id}`)

// CATEGORIES
export const getCategories = (params) => api.get('/categories', { params })
export const addCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// PRODUCTS
export const getProducts = (params) => api.get('/products', { params })
export const getProductById = (id) => api.get(`/products/${id}`)
export const addProduct = (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateProduct = (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const getPublicProducts = (params) => axios.get(`${API_URL}/products/public`, { params })

// ANIMALS
export const getAnimals = (params) => api.get('/animals', { params })
export const getAnimalById = (id) => api.get(`/animals/${id}`)
export const addAnimal = (data) => api.post('/animals', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateAnimal = (id, data) => api.put(`/animals/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteAnimal = (id) => api.delete(`/animals/${id}`)
export const getPublicAnimals = (params) => axios.get(`${API_URL}/animals/public`, { params })

// INVOICE & UPI
export const getInvoiceUrl = (orderId) => `${API_URL}/invoice/${orderId}`
export const getUPIQR = (orderId) => api.get(`/upi/${orderId}`)

// EXPENSES
export const getExpenses = (params) => api.get('/expenses', { params })
export const addExpense = (data) => api.post('/expenses', data)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)

// REPORTS
export const getReports = (period) => api.get('/reports', { params: { period } })
export const placePublicOrder = (data) => api.post('/reports/public-order', data)

// HEALTH
export const getHealthRecords = (animalId) => api.get(`/health/${animalId}`)
export const getAllHealthRecords = (params) => api.get('/health', { params })
export const addHealthRecord = (data) => api.post('/health', data)
export const updateHealthRecord = (id, data) => api.put(`/health/${id}`, data)
export const deleteHealthRecord = (id) => api.delete(`/health/${id}`)

// WEIGHT
export const getWeightLogs = (animalId) => api.get(`/weight/${animalId}`)
export const addWeightLog = (data) => api.post('/weight', data)

// BREEDING
export const getBreedingRecords = () => api.get('/breeding')
export const addBreedingRecord = (data) => api.post('/breeding', data)
export const updateBreedingRecord = (id, data) => api.put(`/breeding/${id}`, data)
export const deleteBreedingRecord = (id) => api.delete(`/breeding/${id}`)

// TASKS
export const getTasks = (params) => api.get('/tasks', { params })
export const createTask = (data) => api.post('/tasks', data)
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data)
export const deleteTask = (id) => api.delete(`/tasks/${id}`)

// ATTENDANCE
export const getAttendance = (params) => api.get('/attendance', { params })
export const getAttendanceSummary = (params) => api.get('/attendance/summary', { params })
export const markAttendance = (data) => api.post('/attendance', data)

// DELIVERY PARTNERS
export const getDeliveryPartners = () => api.get('/delivery/partners')
export const addDeliveryPartner = (data) => api.post('/delivery/partners', data)
export const updateDeliveryPartner = (id, data) => api.put(`/delivery/partners/${id}`, data)
export const deleteDeliveryPartner = (id) => api.delete(`/delivery/partners/${id}`)

// SHIPMENTS
export const getShipments = (params) => api.get('/delivery/shipments', { params })
export const createShipment = (data) => api.post('/delivery/shipments', data)
export const updateShipment = (id, data) => api.put(`/delivery/shipments/${id}`, data)
export const trackShipment = (code) => api.get(`/delivery/shipments/track/${code}`)
export const trackShipmentPublic = (code) => axios.get(`${API_URL}/delivery/shipments/track/${code}`)
export const getDeliveryStats = () => api.get('/delivery/shipments/stats')

export default api
