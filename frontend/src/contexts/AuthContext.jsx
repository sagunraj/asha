import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('asha_user')) } catch { return null }
  })
  const [role, setRole]   = useState(() => localStorage.getItem('asha_role') || null)
  const [token, setToken] = useState(() => localStorage.getItem('asha_token') || null)

  useEffect(() => {
    if (token) api.setToken(token)
  }, [token])

  const saveSession = useCallback((userData, userRole, accessToken) => {
    setUser(userData)
    setRole(userRole)
    setToken(accessToken)
    localStorage.setItem('asha_user', JSON.stringify(userData))
    localStorage.setItem('asha_role', userRole)
    localStorage.setItem('asha_token', accessToken)
    api.setToken(accessToken)
  }, [])

  const sendOTP = useCallback(async (email) => {
    try {
      await api.post('/api/v1/auth/send-otp/', { email })
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const verifyOTP = useCallback(async (email, otp) => {
    try {
      const data = await api.post('/api/v1/auth/verify-otp/', { email, otp })
      saveSession(data.donor, 'donor', data.access_token)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [saveSession])

  const adminLogin = useCallback(async (email, password) => {
    try {
      const data = await api.post('/api/v1/auth/admin-login/', { email, password })
      saveSession(data.admin, 'admin', data.access_token)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [saveSession])

  const logout = useCallback(() => {
    setUser(null)
    setRole(null)
    setToken(null)
    localStorage.removeItem('asha_user')
    localStorage.removeItem('asha_role')
    localStorage.removeItem('asha_token')
    api.setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, token, sendOTP, verifyOTP, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
