import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  fetchAdminProfile,
  getStoredToken,
  loginAdmin,
  logoutAdmin,
  setStoredToken,
} from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()))

  const refreshProfile = useCallback(async () => {
    try {
      const data = await fetchAdminProfile()
      setUser(data.user)
      return data.user
    } catch (err) {
      setStoredToken(null)
      setUser(null)
      throw err
    }
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }

    let active = true
    fetchAdminProfile()
      .then((data) => {
        if (active) {
          setUser(data.user)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setStoredToken(null)
          setUser(null)
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (identifier, password) => {
    const data = await loginAdmin(identifier, password)
    setStoredToken(data.token)
    // Ensure user object has top-level role/permissions/must_change_password if provided
    const userPayload = {
      ...data.user,
      role: data.role || data.user?.role,
      permissions: data.permissions || data.user?.permissions || [],
      must_change_password:
        typeof data.must_change_password === 'boolean'
          ? data.must_change_password
          : Boolean(data.user?.must_change_password),
    }
    setUser(userPayload)
    return userPayload
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutAdmin()
    } catch {
      // Proceed with local cleanup even if token was already invalidated
    } finally {
      setStoredToken(null)
      setUser(null)
    }
  }, [])

  const updateLocalUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : null))
  }, [])

  const isSuperAdmin = useMemo(() => {
    return Boolean(user && (user.is_superuser || user.role === 'super_admin'))
  }, [user])

  const permissions = useMemo(() => {
    if (!user) return []
    if (isSuperAdmin) {
      return ['dashboard', 'events', 'gallery', 'qr_codes', 'ai_recognition', 'guest_activity', 'administrators']
    }
    return Array.isArray(user.permissions) ? user.permissions : []
  }, [user, isSuperAdmin])

  const mustChangePassword = useMemo(() => {
    return Boolean(user?.must_change_password)
  }, [user])

  const hasPermission = useCallback(
    (moduleKey) => {
      if (!user) return false
      if (isSuperAdmin) return true
      if (moduleKey === 'dashboard') return true
      return permissions.includes(moduleKey)
    },
    [user, isSuperAdmin, permissions]
  )

  const value = useMemo(
    () => ({
      user,
      role: isSuperAdmin ? 'super_admin' : 'regular_admin',
      isSuperAdmin,
      permissions,
      mustChangePassword,
      hasPermission,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      refreshProfile,
      updateLocalUser,
    }),
    [
      user,
      isSuperAdmin,
      permissions,
      mustChangePassword,
      hasPermission,
      loading,
      login,
      logout,
      refreshProfile,
      updateLocalUser,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return ctx
}


