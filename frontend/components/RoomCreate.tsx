'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface RoomCreateProps {
  currentUser: { id: string; email: string; nickname: string } | null
  onRoomCreated: () => void
}

export function RoomCreate({ currentUser, onRoomCreated }: RoomCreateProps) {
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      setError('Please register first to create a room')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiClient.createRoom({ title, theme })
      setSuccess(`Room created: ${data.room.title}`)
      setTitle('')
      setTheme('')
      onRoomCreated()
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
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Room Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!currentUser}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="My Drawing Room"
          />
        </div>

        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
            Theme
          </label>
          <input
            id="theme"
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            required
            disabled={!currentUser}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Nature, Abstract, etc."
          />
        </div>

        {!currentUser && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            Please register as a user first to create rooms
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !currentUser}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </form>

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
