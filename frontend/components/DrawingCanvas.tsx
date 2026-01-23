'use client'

import { useState, useEffect, useRef } from 'react'
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

export function DrawingCanvas({ roomId, currentUser }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(3)
  const [tool, setTool] = useState('pen')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [loading, setLoading] = useState(false)

  const loadStrokes = async () => {
    if (!roomId) return

    try {
      const data = await apiClient.getStrokes(roomId)
      setStrokes(data.strokes || [])
      redrawCanvas(data.strokes || [])
    } catch (err) {
      console.error('Failed to load strokes:', err)
    }
  }

  const redrawCanvas = (strokeList: Stroke[]) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all strokes
    strokeList.forEach((stroke) => {
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
  }

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
    setCurrentStroke((prev) => [...prev, pos])

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
      return
    }

    setIsDrawing(false)

    try {
      const response = await apiClient.createStroke(roomId, {
        tool,
        color,
        width,
        points: currentStroke,
      })

      // Emit to other users via Socket.io
      const socket = getSocket()
      if (socket.connected) {
        socket.emit('draw-stroke', {
          roomId,
          stroke: response.stroke,
        })
      }

      // Add to local strokes
      setStrokes((prev) => [...prev, response.stroke])
      redrawCanvas([...strokes, response.stroke])

      setCurrentStroke([])
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
      await loadStrokes()
    } catch (err) {
      console.error('Failed to clear canvas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!roomId || !currentUser) return

    // Load initial strokes
    loadStrokes()

    // Connect socket and join room
    const socket = getSocket()
    socket.connect()
    socket.emit('join-room', roomId)

    // Listen for new strokes from other users
    socket.on('stroke-drawn', (stroke: Stroke) => {
      setStrokes((prev) => {
        const updated = [...prev, stroke]
        redrawCanvas(updated)
        return updated
      })
    })

    // Cleanup
    return () => {
      socket.emit('leave-room', roomId)
      socket.off('stroke-drawn')
    }
  }, [roomId, currentUser])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 800
      canvas.height = 600
      
      // Prevent default behavior on the canvas element
      const preventScroll = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }
      
      // Add event listeners to prevent scrolling
      canvas.addEventListener('touchstart', preventScroll, { passive: false })
      canvas.addEventListener('touchmove', preventScroll, { passive: false })
      canvas.addEventListener('touchend', preventScroll, { passive: false })
      canvas.addEventListener('wheel', preventScroll, { passive: false })
      canvas.addEventListener('mousedown', preventScroll, { passive: false })
      canvas.addEventListener('mousemove', preventScroll, { passive: false })
      
      return () => {
        canvas.removeEventListener('touchstart', preventScroll)
        canvas.removeEventListener('touchmove', preventScroll)
        canvas.removeEventListener('touchend', preventScroll)
        canvas.removeEventListener('wheel', preventScroll)
        canvas.removeEventListener('mousedown', preventScroll)
        canvas.removeEventListener('mousemove', preventScroll)
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
            onFocus={(e) => e.preventDefault()}
            onBlur={(e) => e.preventDefault()}
            disabled={loading || !currentUser}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ scrollMargin: 0 }}
          >
            Clear Canvas
          </button>
        </div>
      </div>

      <div 
        className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onDragStart={(e) => e.preventDefault()}
          className="cursor-crosshair select-none"
          style={{ 
            display: 'block', 
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none'
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
