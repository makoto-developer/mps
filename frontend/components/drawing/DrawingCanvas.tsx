'use client'

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { apiClient } from '@/lib/api-client'
import { getSocket } from '@/lib/socket'
import { Point, Stroke, DrawingTool } from '@/types'

export interface DrawingCanvasHandle {
  clearCanvas: () => Promise<void>
  undo: () => void
}

interface DrawingCanvasProps {
  roomId: string
  color: string
  brushSize: number
  tool: DrawingTool
  onStrokesChange?: (strokes: Stroke[]) => void
}

// Flood fill algorithm
function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  canvas: HTMLCanvasElement
): ImageData | null {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Convert hex color to RGB
  const fillRGB = hexToRGB(fillColor)
  if (!fillRGB) return null

  // Get the color at the start position
  const startPos = (Math.floor(startY) * canvas.width + Math.floor(startX)) * 4
  const startR = data[startPos]
  const startG = data[startPos + 1]
  const startB = data[startPos + 2]
  const startA = data[startPos + 3]

  // If the start color is the same as fill color, return
  if (
    startR === fillRGB.r &&
    startG === fillRGB.g &&
    startB === fillRGB.b &&
    startA === 255
  ) {
    return null
  }

  // Use a stack-based approach for flood fill
  const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]]
  const visited = new Set<string>()
  const tolerance = 32 // Color matching tolerance

  const matchesStart = (pos: number): boolean => {
    const r = data[pos]
    const g = data[pos + 1]
    const b = data[pos + 2]
    const a = data[pos + 3]

    return (
      Math.abs(r - startR) <= tolerance &&
      Math.abs(g - startG) <= tolerance &&
      Math.abs(b - startB) <= tolerance &&
      Math.abs(a - startA) <= tolerance
    )
  }

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    const key = `${x},${y}`

    if (visited.has(key)) continue
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue

    const pos = (y * canvas.width + x) * 4

    if (!matchesStart(pos)) continue

    visited.add(key)

    // Set the new color
    data[pos] = fillRGB.r
    data[pos + 1] = fillRGB.g
    data[pos + 2] = fillRGB.b
    data[pos + 3] = 255

    // Add neighbors
    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
  }

  return imageData
}

function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas({
  roomId,
  color,
  brushSize,
  tool,
  onStrokesChange,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  const redrawCanvas = useCallback((strokeList: Stroke[]) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    strokeList.forEach((stroke) => {
      const points = typeof stroke.points === 'string'
        ? JSON.parse(stroke.points)
        : stroke.points

      // Handle fill strokes
      if (stroke.tool === 'fill' && points.length === 1) {
        // Re-apply flood fill
        const filledImageData = floodFill(ctx, points[0].x, points[0].y, stroke.color, canvas)
        if (filledImageData) {
          ctx.putImageData(filledImageData, 0, 0)
        }
        return
      }

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
  }, [])

  const loadStrokes = useCallback(async () => {
    if (!roomId) return

    try {
      const data = await apiClient.getStrokes(roomId)
      const loadedStrokes = data.strokes || []
      setStrokes(loadedStrokes)
      redrawCanvas(loadedStrokes)
      onStrokesChange?.(loadedStrokes)
    } catch (err) {
      console.error('Failed to load strokes:', err)
    }
  }, [roomId, redrawCanvas, onStrokesChange])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const touch = e.touches[0] || e.changedTouches[0]
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    }
  }

  // Handle fill tool click
  const handleFill = async (pos: Point) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Apply flood fill
    const filledImageData = floodFill(ctx, pos.x, pos.y, color, canvas)
    if (!filledImageData) return

    ctx.putImageData(filledImageData, 0, 0)

    // Save fill as a stroke with single point
    try {
      const response = await apiClient.createStroke(roomId, {
        tool: 'fill',
        color,
        width: 1,
        points: [pos],
      })

      const socket = getSocket()
      if (socket.connected) {
        socket.emit('draw-stroke', {
          roomId,
          stroke: response.stroke,
        })
      }

      const newStrokes = [...strokes, response.stroke]
      setStrokes(newStrokes)
      onStrokesChange?.(newStrokes)
    } catch (err) {
      console.error('Failed to save fill:', err)
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getMousePos(e)

    // Handle fill tool differently
    if (tool === 'fill') {
      handleFill(pos)
      return
    }

    setIsDrawing(true)
    setCurrentStroke([pos])

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getTouchPos(e)

    // Handle fill tool differently
    if (tool === 'fill') {
      handleFill(pos)
      return
    }

    setIsDrawing(true)
    setCurrentStroke([pos])

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'fill') return

    e.preventDefault()
    const pos = getMousePos(e)
    setCurrentStroke((prev) => [...prev, pos])

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'fill') return

    e.preventDefault()
    const pos = getTouchPos(e)
    setCurrentStroke((prev) => [...prev, pos])

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const endDrawing = async () => {
    if (!isDrawing || currentStroke.length < 2 || tool === 'fill') {
      setIsDrawing(false)
      setCurrentStroke([])
      return
    }

    setIsDrawing(false)

    try {
      const response = await apiClient.createStroke(roomId, {
        tool,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        width: brushSize,
        points: currentStroke,
      })

      const socket = getSocket()
      if (socket.connected) {
        socket.emit('draw-stroke', {
          roomId,
          stroke: response.stroke,
        })
      }

      const newStrokes = [...strokes, response.stroke]
      setStrokes(newStrokes)
      redrawCanvas(newStrokes)
      onStrokesChange?.(newStrokes)

      setCurrentStroke([])
    } catch (err) {
      console.error('Failed to save stroke:', err)
    }
  }

  const clearCanvas = useCallback(async () => {
    if (!confirm('Clear all drawings?')) return

    try {
      await apiClient.clearStrokes(roomId)
      setStrokes([])
      redrawCanvas([])
      onStrokesChange?.([])
    } catch (err) {
      console.error('Failed to clear canvas:', err)
    }
  }, [roomId, redrawCanvas, onStrokesChange])

  const undo = useCallback(() => {
    setStrokes((prevStrokes) => {
      if (prevStrokes.length === 0) return prevStrokes
      const newStrokes = prevStrokes.slice(0, -1)
      redrawCanvas(newStrokes)
      onStrokesChange?.(newStrokes)
      return newStrokes
    })
  }, [redrawCanvas, onStrokesChange])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearCanvas,
    undo,
  }), [clearCanvas, undo])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setCanvasSize({
          width: Math.floor(width),
          height: Math.floor(height),
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Redraw when canvas size changes
  useEffect(() => {
    redrawCanvas(strokes)
  }, [canvasSize, strokes, redrawCanvas])

  // Load strokes and setup socket
  useEffect(() => {
    if (!roomId) return

    loadStrokes()

    const socket = getSocket()
    socket.connect()
    socket.emit('join-room', roomId)

    socket.on('stroke-drawn', (stroke: Stroke) => {
      setStrokes((prev) => {
        const updated = [...prev, stroke]
        redrawCanvas(updated)
        onStrokesChange?.(updated)
        return updated
      })
    })

    return () => {
      socket.emit('leave-room', roomId)
      socket.off('stroke-drawn')
    }
  }, [roomId, loadStrokes, redrawCanvas, onStrokesChange])

  // Cursor style based on tool
  const getCursorStyle = () => {
    switch (tool) {
      case 'fill':
        return 'crosshair'
      case 'eraser':
        return 'cell'
      default:
        return 'crosshair'
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded-xl overflow-hidden shadow-inner"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawingTouch}
        onTouchMove={drawTouch}
        onTouchEnd={endDrawing}
        onTouchCancel={endDrawing}
        className="w-full h-full select-none"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: getCursorStyle(),
        }}
      />
    </div>
  )
})
