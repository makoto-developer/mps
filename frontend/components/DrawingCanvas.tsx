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

interface LiveStroke {
  odStrokeId: string
  odUserId: string
  tool: string
  color: string
  width: number
  points: Point[]
}

export function DrawingCanvas({ roomId, currentUser }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(3)
  const [tool, _setTool] = useState('pen')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [loading, setLoading] = useState(false)

  // Use ref for live strokes to avoid re-render loops
  const liveStrokesRef = useRef<Map<string, LiveStroke>>(new Map())
  const currentStrokeIdRef = useRef<string>('')
  const strokesRef = useRef<Stroke[]>([])
  const currentStrokeRef = useRef<Point[]>([])
  const currentColorRef = useRef<string>('#000000')
  const currentWidthRef = useRef<number>(3)

  // Keep refs in sync
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    currentStrokeRef.current = currentStroke
  }, [currentStroke])

  useEffect(() => {
    currentColorRef.current = color
  }, [color])

  useEffect(() => {
    currentWidthRef.current = width
  }, [width])

  // Draw a single stroke on canvas (incremental)
  const drawStrokeOnCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    points: Point[],
    strokeColor: string,
    strokeWidth: number,
    startIndex: number = 0
  ) => {
    if (points.length < 2) return

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const start = Math.max(0, startIndex)
    if (start === 0) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
    }

    for (let i = Math.max(1, start); i < points.length; i++) {
      ctx.beginPath()
      ctx.moveTo(points[i - 1].x, points[i - 1].y)
      ctx.lineTo(points[i].x, points[i].y)
      ctx.stroke()
    }
  }, [])

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
      drawStrokeOnCanvas(ctx, points, stroke.color, stroke.width)
    })

    // Draw live strokes from other users
    liveStrokesRef.current.forEach((liveStroke) => {
      if (liveStroke.points.length < 2) return
      drawStrokeOnCanvas(ctx, liveStroke.points, liveStroke.color, liveStroke.width)
    })

    // Draw current stroke (self)
    if (currentStrokeRef.current.length >= 2) {
      drawStrokeOnCanvas(ctx, currentStrokeRef.current, currentColorRef.current, currentWidthRef.current)
    }
  }, [drawStrokeOnCanvas])

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentUser) return

    e.preventDefault()
    const pos = getMousePos(e)
    setIsDrawing(true)
    setCurrentStroke([pos])
    currentStrokeRef.current = [pos]

    const strokeId = `${currentUser.id}-${Date.now()}`
    currentStrokeIdRef.current = strokeId

    const socket = getSocket()
    if (socket.connected) {
      socket.emit('stroke-start', {
        roomId,
        strokeId,
        userId: currentUser.id,
        tool,
        color,
        width,
        point: pos,
      })
    }

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentUser) return

    e.preventDefault()
    const pos = getMousePos(e)

    setCurrentStroke((prev) => {
      const newStroke = [...prev, pos]
      currentStrokeRef.current = newStroke
      return newStroke
    })

    const socket = getSocket()
    if (socket.connected && currentStrokeIdRef.current) {
      socket.emit('stroke-point', {
        roomId,
        strokeId: currentStrokeIdRef.current,
        point: pos,
      })
    }

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const endDrawing = async () => {
    if (!isDrawing || !currentUser || currentStroke.length < 2) {
      setIsDrawing(false)
      setCurrentStroke([])
      currentStrokeRef.current = []
      currentStrokeIdRef.current = ''
      return
    }

    setIsDrawing(false)
    const strokeId = currentStrokeIdRef.current
    const finalPoints = [...currentStroke]
    currentStrokeIdRef.current = ''

    const socket = getSocket()
    if (socket.connected && strokeId) {
      socket.emit('stroke-end', {
        roomId,
        strokeId,
      })
    }

    try {
      const response = await apiClient.createStroke(roomId, {
        tool,
        color,
        width,
        points: finalPoints,
      })

      if (socket.connected) {
        socket.emit('draw-stroke', {
          roomId,
          stroke: response.stroke,
        })
      }

      setStrokes((prev) => [...prev, response.stroke])
      setCurrentStroke([])
      currentStrokeRef.current = []
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

      // Clear local state
      setStrokes([])
      strokesRef.current = []
      liveStrokesRef.current.clear()

      // Clear canvas immediately
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }

      // Notify other users
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

  // Socket event handlers - setup once
  useEffect(() => {
    if (!roomId || !currentUser) return

    loadStrokes()

    const socket = getSocket()
    socket.connect()
    socket.emit('join-room', roomId)

    // Other user started drawing
    const handleStrokeStarted = (data: { strokeId: string; userId: string; tool: string; color: string; width: number; point: Point }) => {
      if (data.userId === currentUser.id) return

      liveStrokesRef.current.set(data.strokeId, {
        odStrokeId: data.strokeId,
        odUserId: data.userId,
        tool: data.tool,
        color: data.color,
        width: data.width,
        points: [data.point],
      })
    }

    // Other user is drawing (point by point)
    const handleStrokePointed = (data: { strokeId: string; point: Point }) => {
      const liveStroke = liveStrokesRef.current.get(data.strokeId)
      if (!liveStroke) return

      const prevPoints = liveStroke.points
      liveStroke.points = [...prevPoints, data.point]
      liveStrokesRef.current.set(data.strokeId, liveStroke)

      // Draw the new segment immediately
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.strokeStyle = liveStroke.color
      ctx.lineWidth = liveStroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prevPoints[prevPoints.length - 1].x, prevPoints[prevPoints.length - 1].y)
      ctx.lineTo(data.point.x, data.point.y)
      ctx.stroke()
    }

    // Other user finished drawing
    const handleStrokeEnded = (data: { strokeId: string }) => {
      liveStrokesRef.current.delete(data.strokeId)
    }

    // Completed stroke received (for persistence)
    const handleStrokeDrawn = (stroke: Stroke) => {
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
    }

    // Canvas cleared by another user
    const handleCanvasCleared = () => {
      setStrokes([])
      strokesRef.current = []
      liveStrokesRef.current.clear()

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    }

    socket.on('stroke-started', handleStrokeStarted)
    socket.on('stroke-pointed', handleStrokePointed)
    socket.on('stroke-ended', handleStrokeEnded)
    socket.on('stroke-drawn', handleStrokeDrawn)
    socket.on('canvas-cleared', handleCanvasCleared)

    return () => {
      socket.emit('leave-room', roomId)
      socket.off('stroke-started', handleStrokeStarted)
      socket.off('stroke-pointed', handleStrokePointed)
      socket.off('stroke-ended', handleStrokeEnded)
      socket.off('stroke-drawn', handleStrokeDrawn)
      socket.off('canvas-cleared', handleCanvasCleared)
    }
  }, [roomId, currentUser, loadStrokes])

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
