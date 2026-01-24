'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await register({ email, password, nickname })
      router.push('/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to create account')
      } else {
        setError('Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="user@example.com"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        placeholder="At least 8 characters"
        helperText="Password must be at least 8 characters"
      />

      <Input
        label="Nickname"
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        required
        placeholder="Your display name"
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button type="submit" variant="secondary" isLoading={loading} className="w-full">
        Create Account
      </Button>

      <p className="text-sm text-gray-500 text-center">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary-600 hover:text-primary-800 font-medium">
          Login here
        </Link>
      </p>
    </form>
  )
}
