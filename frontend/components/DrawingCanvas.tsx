'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { getSocket } from '@/lib/socket'

interface DrawingCanvasProps {
  roomId: string
  currentUser: { id: string; nickname: string } | null
}

interface Point {
  x: number
  y: number
}

interface Stroke {
  id: string
  tool: string
  color: string
  width: number
  points: Point[]
  user: {
    id: string
    nickname: string
  }
}

// 他ユーザーが描画中のストローク
interface LiveStroke {
visibleStrokeId: string
  odUserId: string
  color: string
  width: number
  points: Point[]
}

export function DrawingCanvas({ roomId, currentUser }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(3)
  const [tool] = useState('pen')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [loading, setLoading] = useState(false)

  // Refs for real-time sync
  const liveStrokesRef = useRef<Map<string, LiveStroke>>(new Map())
  const currentStrokeIdRef = useRef<string>('')
  const currentStrokePointsRef = useRef<Point[]>([])
  const strokesRef = useRef<Stroke[]>([])
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Sync interval (ms)
  const SYNC_INTERVAL = 50

  // Keep strokes ref in sync
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  // Full canvas redraw
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all completed strokes
    strokesRef.current.forEach((stroke) => {
      const points = typeof stroke.points === 'string'
        ? JSON.parse(stroke.points)
        : stroke.points

      if (points.length < 2) return

      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
    })

    // Draw live strokes from other users
    liveStrokesRef.current.forEach((liveStroke) => {
      if (liveStroke.points.length < 2) return

      ctx.strokeStyle = liveStroke.color
      ctx.lineWidth = liveStroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(liveStroke.points[0].x, liveStroke.points[0].y)
      for (let i = 1; i < liveStroke.points.length; i++) {
        ctx.lineTo(liveStroke.points[i].x, liveStroke.points[i].y)
      }
      ctx.stroke()
    })

    // Draw current stroke (self)
    if (currentStrokePointsRef.current.length >= 2) {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(currentStrokePointsRef.current[0].x, currentStrokePointsRef.current[0].y)
      for (let i = 1; i < currentStrokePointsRef.current.length; i++) {
        ctx.lineTo(currentStrokePointsRef.current[i].x, currentStrokePointsRef.current[i].y)
      }
      ctx.stroke()
    }
  }, [color, width])

  const loadStrokes = useCallback(async () => {
    if (!roomId) return

    try {
      const data = await apiClient.getStrokes(roomId)
      setStrokes(data.strokes || [])
      strokesRef.current = data.strokes || []
      redrawCanvas()
    } catch (err) {
      console.error('Failed to load strokes:', err)
    }
  }, [roomId, redrawCanvas])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // Send current stroke points to other users
  const syncStrokePoints = useCallback(() => {
    if (!currentStrokeIdRef.current || currentStrokePointsRef.current.length === 0) return

    const socket = getSocket()
    console.log('[DEBUG] syncStrokePoints - connected:', socket.connected, 'points:', currentStrokePointsRef.current.length)
    if (socket.connected) {
      socket.emit('stroke-sync', {
        roomId,
        strokeId: currentStrokeIdRef.current,
        odUserId: currentUser?.id,
        color,
        width,
        points: currentStrokePointsRef.current,
      })
    }
  }, [roomId, currentUser, color, width])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentUser) return

    e.preventDefault()
    const pos = getMousePos(e)
    setIsDrawing(true)

    const strokeId = `${currentUser.id}-${Date.now()}`
    currentStrokeIdRef.current = strokeId
    currentStrokePointsRef.current = [pos]

    // Start sync interval
    syncIntervalRef.current = setInterval(() => {
      syncStrokePoints()
    }, SYNC_INTERVAL)

    // Initial sync
    syncStrokePoints()

    redrawCanvas()
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentUser) return

    e.preventDefault()
    const pos = getMousePos(e)

    currentStrokePointsRef.current = [...currentStrokePointsRef.current, pos]
    redrawCanvas()
  }

  const endDrawing = async () => {
    if (!isDrawing || !currentUser) {
      setIsDrawing(false)
      return
    }

    // Stop sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    setIsDrawing(false)

    const finalPoints = [...currentStrokePointsRef.current]
    const strokeId = currentStrokeIdRef.current

    // Notify stroke end
    const socket = getSocket()
    if (socket.connected && strokeId) {
      socket.emit('stroke-end', { roomId, strokeId })
    }

    currentStrokeIdRef.current = ''
    currentStrokePointsRef.current = []

    if (finalPoints.length < 2) {
      redrawCanvas()
      return
    }

    try {
      const response = await apiClient.createStroke(roomId, {
        tool,
        color,
        width,
        points: finalPoints,
      })

      if (socket.connected) {
        socket.emit('stroke-complete', {
          roomId,
          stroke: response.stroke,
        })
      }

      setStrokes((prev) => [...prev, response.stroke])
      redrawCanvas()
    } catch (err) {
      console.error('Failed to save stroke:', err)
    }
  }

  const clearCanvas = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUser) return
    if (!confirm('Clear all drawings?')) return

    setLoading(true)

    try {
      await apiClient.clearStrokes(roomId)

      setStrokes([])
      strokesRef.current = []
      liveStrokesRef.current.clear()
      redrawCanvas()

      const socket = getSocket()
      if (socket.connected) {
        socket.emit('canvas-clear', { roomId })
      }
    } catch (err) {
      console.error('Failed to clear canvas:', err)
      alert('Failed to clear canvas')
    } finally {
      setLoading(false)
    }
  }

  // Socket event handlers
  useEffect(() => {
    console.log('[DEBUG] useEffect - roomId:', roomId, 'currentUser:', currentUser?.id)
    if (!roomId || !currentUser) return

    loadStrokes()

    const socket = getSocket()
    console.log('[DEBUG] getSocket - id:', socket.id, 'connected:', socket.connected)

    const joinRoom = () => {
      console.log('[DEBUG] joinRoom called, socket.connected:', socket.connected)
      socket.emit('join-room', roomId)
      console.log('[DEBUG] join-room emitted for room:', roomId)
    }

    // Wait for connection before joining room
    socket.on('connect', () => {
      console.log('[DEBUG] socket connect event fired')
      joinRoom()
    })

    if (socket.connected) {
      console.log('[DEBUG] socket already connected, joining room directly')
      joinRoom()
    } else {
      console.log('[DEBUG] socket not connected, calling connect()')
      socket.connect()
    }

    // Receive stroke sync from other users (point collection)
    const handleStrokeSync = (data: {
      strokeId: string
      odUserId: string
      color: string
      width: number
      points: Point[]
    }) => {
      if (data.odUserId === currentUser.id) return

      liveStrokesRef.current.set(data.strokeId, {
        visibleStrokeId: data.strokeId,
        odUserId: data.odUserId,
        color: data.color,
        width: data.width,
        points: data.points,
      })

      redrawCanvas()
    }

    // Other user finished drawing
    const handleStrokeEnd = (data: { strokeId: string }) => {
      liveStrokesRef.current.delete(data.strokeId)
      redrawCanvas()
    }

    // Completed stroke received
    const handleStrokeComplete = (stroke: Stroke) => {
      // Remove from live strokes
      liveStrokesRef.current.forEach((_, key) => {
        if (key.startsWith(stroke.user?.id || '')) {
          liveStrokesRef.current.delete(key)
        }
      })

      setStrokes((prev) => {
        const updated = [...prev, stroke]
        strokesRef.current = updated
        return updated
      })

      redrawCanvas()
    }

    // Canvas cleared
    const handleCanvasCleared = () => {
      setStrokes([])
      strokesRef.current = []
      liveStrokesRef.current.clear()
      redrawCanvas()
    }

    socket.on('stroke-synced', handleStrokeSync)
    socket.on('stroke-ended', handleStrokeEnd)
    socket.on('stroke-completed', handleStrokeComplete)
    socket.on('canvas-cleared', handleCanvasCleared)

    return () => {
      socket.emit('leave-room', roomId)
      socket.off('stroke-synced', handleStrokeSync)
      socket.off('stroke-ended', handleStrokeEnd)
      socket.off('stroke-completed', handleStrokeComplete)
      socket.off('canvas-cleared', handleCanvasCleared)

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [roomId, currentUser, loadStrokes, redrawCanvas])

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 800
      canvas.height = 600

      const preventScroll = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      canvas.addEventListener('touchstart', preventScroll, { passive: false })
      canvas.addEventListener('touchmove', preventScroll, { passive: false })
      canvas.addEventListener('touchend', preventScroll, { passive: false })
      canvas.addEventListener('wheel', preventScroll, { passive: false })

      return () => {
        canvas.removeEventListener('touchstart', preventScroll)
        canvas.removeEventListener('touchmove', preventScroll)
        canvas.removeEventListener('touchend', preventScroll)
        canvas.removeEventListener('wheel', preventScroll)
      }
    }
  }, [])

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
  ]

  const widths = [1, 3, 5, 10, 20]

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded border-2 ${
                  color === c ? 'border-blue-500 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
          <div className="flex gap-2">
            {widths.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`px-3 py-1 rounded border ${
                  width === w
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={clearCanvas}
            disabled={loading || !currentUser}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      <div
        className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          className="cursor-crosshair select-none"
          style={{
            display: 'block',
            touchAction: 'none',
            userSelect: 'none',
          }}
        />
      </div>

      {!currentUser && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm text-center">
          Please log in to draw
        </div>
      )}
    </div>
  )
}
