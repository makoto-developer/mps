'use client'

import { useState, useEffect, useCallback } from 'react'
import { RoomWithParticipants } from '@/types'
import { RoomCard } from './RoomCard'
import { Button } from '@/components/ui'
import { apiClient } from '@/lib/api-client'
import { getSocket } from '@/lib/socket'

interface RoomGridProps {
  refreshTrigger?: number
}

export function RoomGrid({ refreshTrigger }: RoomGridProps) {
  const [rooms, setRooms] = useState<RoomWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRooms = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiClient.getRooms()
      // Map rooms to include participants (initially empty or from API)
      const roomsWithParticipants: RoomWithParticipants[] = (data.rooms || []).map((room: RoomWithParticipants) => ({
        ...room,
        participants: room.participants || [],
        participantCount: room.participantCount || 0,
      }))
      setRooms(roomsWithParticipants)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load rooms')
      } else {
        setError('Failed to load rooms')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [refreshTrigger, loadRooms])

  // Listen for room participant updates
  useEffect(() => {
    const socket = getSocket()
    socket.connect()

    // Listen for participant join/leave events
    socket.on('room-participants-updated', (data: { roomId: string; participants: RoomWithParticipants['participants']; participantCount: number }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === data.roomId
            ? { ...room, participants: data.participants, participantCount: data.participantCount }
            : room
        )
      )
    })

    return () => {
      socket.off('room-participants-updated')
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadRooms} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms yet</h3>
        <p className="text-gray-600 mb-4">Create your first room to get started!</p>
      </div>
    )
  }

  // Count total active users
  const totalActiveUsers = rooms.reduce((sum, room) => sum + (room.participantCount || 0), 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">{rooms.length} room(s) available</p>
          {totalActiveUsers > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {totalActiveUsers} active user(s)
            </span>
          )}
        </div>
        <Button onClick={loadRooms} variant="ghost" size="sm">
          🔄 Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  )
}
