'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { apiClient } from '@/lib/api-client'

interface RoomCreateFormProps {
  onSuccess?: () => void
}

export function RoomCreateForm({ onSuccess }: RoomCreateFormProps) {
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiClient.createRoom({ title, theme })
      onSuccess?.()
      router.push(`/rooms/${data.room.id}`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to create room')
      } else {
        setError('Failed to create room')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Room Title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="My Drawing Room"
      />

      <Input
        label="Theme"
        type="text"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        required
        placeholder="Nature, Abstract, Animals, etc."
        helperText="Give your room a theme to inspire creativity"
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button type="submit" variant="secondary" isLoading={loading} className="w-full">
        Create Room
      </Button>
    </form>
  )
}
