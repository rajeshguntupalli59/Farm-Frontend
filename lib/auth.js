'use client'

export const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export const getUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const isOwner = () => getUser()?.role === 'OWNER'
export const isManager = () => ['OWNER', 'MANAGER'].includes(getUser()?.role)
export const isEmployee = () => getUser()?.role === 'EMPLOYEE'
