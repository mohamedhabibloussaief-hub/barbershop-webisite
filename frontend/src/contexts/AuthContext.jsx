import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { tokenStore } from '../lib/axios'

const AuthContext = createContext(null)

const ROLE_REDIRECT = {
  client: '/',
  barber: '/employee/dashboard',
  admin:  '/admin/dashboard',
}

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate                  = useNavigate()

  useEffect(() => {
    const token = tokenStore.access
    if (!token) {
      setIsLoading(false)
      return
    }

    api.get('/auth/me/')
      .then(({ data }) => {
        setUser(data.data.user)
      })
      .catch(() => {
        tokenStore.clear()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback((data) => {
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
    const redirect = ROLE_REDIRECT[data.user.role] ?? '/'
    navigate(redirect, { replace: true })
  }, [navigate])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (tokenStore.refresh) {
        await api.post('/auth/logout/', { refresh: tokenStore.refresh })
      }
    } catch {
      // Ignore — still clear local state.
    }
    tokenStore.clear()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    updateUser,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
