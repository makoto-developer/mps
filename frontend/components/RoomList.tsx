'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface RoomListProps {
  currentUser: { id: string; email: string; nickname: string } | null
  refreshTrigger?: number
  onRoomSelect?: (roomId: string) => void
}

export function RoomList({ currentUser: _currentUser, refreshTrigger, onRoomSelect }: RoomListProps) {
  const [rooms, setRooms] = useState<Array<{ id: string; title: string; theme: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadRooms = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiClient.getRooms()
      setRooms(data.rooms || [])
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load rooms')
      } else {
        setError('Failed to load rooms')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [refreshTrigger])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {rooms.length} room(s) available
        </p>
        <button
          onClick={loadRooms}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No rooms yet</p>
          <p className="text-sm">Create your first room to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
{rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onRoomSelect?.(room.id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <h3 className="font-medium text-gray-800">{room.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{room.theme}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
