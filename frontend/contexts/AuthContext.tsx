'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User, LoginCredentials, RegisterCredentials } from '@/types'
import { apiClient } from '@/lib/api-client'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = apiClient.getUser()
    if (storedUser) {
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await apiClient.loginUser(credentials)
    if (result.success && result.user) {
      setUser(result.user)
    } else {
      throw new Error(result.error || 'Login failed')
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const result = await apiClient.registerUser(credentials)
    if (result.success && result.user) {
      setUser(result.user)
    } else {
      throw new Error(result.error || 'Registration failed')
    }
  }, [])

  const logout = useCallback(() => {
    apiClient.clearAuth()
    setUser(null)
    router.push('/')
  }, [router])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
