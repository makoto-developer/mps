'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
import { DrawingCanvas, DrawingToolbar } from '@/components/drawing'
import type { DrawingCanvasHandle } from '@/components/drawing'
import { ChatPanel } from '@/components/chat'
import { apiClient } from '@/lib/api-client'
import { getSocket } from '@/lib/socket'
import { Room, DrawingTool, RoomParticipant } from '@/types'

export default function DrawingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const roomId = params.roomId as string

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(3)
  const [tool, setTool] = useState<DrawingTool>('pen')
  const [showChat, setShowChat] = useState(true)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const canvasRef = useRef<DrawingCanvasHandle>(null)

  // Emit tool change to other users
  const emitToolChange = useCallback((newTool: DrawingTool) => {
    if (!user) return
    const socket = getSocket()
    socket.emit('tool-change', {
      roomId,
      userId: user.id,
      nickname: user.nickname,
      tool: newTool,
      color,
    })
  }, [roomId, user, color])

  // Handle tool change
  const handleToolChange = useCallback((newTool: DrawingTool) => {
    setTool(newTool)
    emitToolChange(newTool)
  }, [emitToolChange])

  // Handle color change - also emit to show current color
  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor)
    if (!user) return
    const socket = getSocket()
    socket.emit('tool-change', {
      roomId,
      userId: user.id,
      nickname: user.nickname,
      tool,
      color: newColor,
    })
  }, [roomId, user, tool])

  useEffect(() => {
    const loadRoom = async () => {
      try {
        // Try to get room directly first
        try {
          const data = await apiClient.getRoom(roomId)
          if (data.room) {
            setRoom(data.room)
            setLoading(false)
            return
          }
        } catch {
          // Fallback to listing rooms if direct fetch fails
        }

        // Fallback: find room from list
        const data = await apiClient.getRooms()
        const foundRoom = data.rooms?.find((r: Room) => r.id === roomId)
        if (foundRoom) {
          setRoom(foundRoom)
        } else {
          setNotFound(true)
        }
      } catch (err) {
        console.error('Failed to load room:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    loadRoom()
  }, [roomId])

  // Socket connection for participant tracking
  useEffect(() => {
    if (!roomId || !user) return

    const socket = getSocket()
    socket.connect()

    // Join room with user info
    socket.emit('join-room-with-user', {
      roomId,
      userId: user.id,
      nickname: user.nickname,
      tool,
      color,
    })

    // Listen for participant updates
    socket.on('participants-updated', (data: { participants: RoomParticipant[] }) => {
      setParticipants(data.participants)
    })

    // Listen for individual tool changes
    socket.on('user-tool-changed', (data: RoomParticipant) => {
      setParticipants((prev) => {
        const existing = prev.find((p) => p.id === data.id)
        if (existing) {
          return prev.map((p) => (p.id === data.id ? data : p))
        }
        return [...prev, data]
      })
    })

    // Listen for user leaving
    socket.on('user-left', (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId))
    })

    return () => {
      socket.emit('leave-room-with-user', { roomId, userId: user.id })
      socket.off('participants-updated')
      socket.off('user-tool-changed')
      socket.off('user-left')
    }
  }, [roomId, user, tool, color])

  const handleClear = () => {
    canvasRef.current?.clearCanvas()
  }

  const handleUndo = () => {
    canvasRef.current?.undo()
  }

  const handleExit = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h1>
          <p className="text-gray-600 mb-6">
            The drawing room you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Filter out current user from participants display
  const otherParticipants = participants.filter((p) => p.id !== user?.id)

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex-shrink-0">
              <span className="hidden sm:inline">← Back</span>
              <span className="sm:hidden">←</span>
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {room?.title || 'Drawing Room'}
              </h1>
              {room?.theme && (
                <p className="text-xs text-gray-500 truncate hidden sm:block">Theme: {room.theme}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Participant count badge */}
            {participants.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {participants.length} online
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className="hidden lg:flex"
            >
              {showChat ? '💬 Hide Chat' : '💬 Show Chat'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExit}>
              <span className="hidden sm:inline">Exit</span>
              <span className="sm:hidden">✕</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-4 py-3 flex-shrink-0">
        <DrawingToolbar
          color={color}
          onColorChange={handleColorChange}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          tool={tool}
          onToolChange={handleToolChange}
          onClear={handleClear}
          onUndo={handleUndo}
          disabled={!user}
          participants={otherParticipants}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex px-4 pb-4 gap-4 min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <DrawingCanvas
            ref={canvasRef}
            roomId={roomId}
            color={color}
            brushSize={brushSize}
            tool={tool}
          />
        </div>

        {/* Chat panel - Desktop */}
        {showChat && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <ChatPanel roomId={roomId} currentUser={user} />
          </div>
        )}
      </div>

      {/* Mobile chat panel - Slide up from bottom */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
          showChat ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
          {/* Mobile chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ✕
            </button>
          </div>
          {/* Mobile chat content */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel roomId={roomId} currentUser={user} />
          </div>
        </div>
      </div>

      {/* Mobile chat toggle button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="lg:hidden fixed bottom-4 right-4 z-50 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
        >
          💬
        </button>
      )}

      {/* Participants bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Drawing as:</span>
            <span className="text-sm font-medium text-gray-900">
              {user?.nickname || 'Guest'}
            </span>
            <span className="text-xs text-gray-500">
              ({tool === 'none' ? 'Idle' : tool})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-600">Connected</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
