'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface UserRegistrationProps {
  onUserCreated: (user: { id: string; email: string; nickname: string; role: string }) => void
}

export function UserRegistration({ onUserCreated }: UserRegistrationProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiClient.loginUser({ email, password })
      setSuccess(`Welcome back, ${data.user.nickname}!`)
      onUserCreated(data.user)
      setEmail('')
      setPassword('')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login')
      } else {
        setError('Failed to login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiClient.registerUser({ email, password, nickname })
      setSuccess(`Account created: ${data.user.nickname}`)
      onUserCreated(data.user)
      setEmail('')
      setPassword('')
      setNickname('')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to create user')
      } else {
        setError('Failed to create user')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setError('')
    setSuccess('')
    setPassword('')
  }

  return (
    <div>
      <div className="flex mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            mode === 'login'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => switchMode('register')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            mode === 'register'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Register
        </button>
      </div>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Register here
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="register-nickname" className="block text-sm font-medium text-gray-700 mb-1">
              Nickname
            </label>
            <input
              id="register-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Login here
            </button>
          </p>
        </form>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}
