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

// Live stroke from other users
interface LiveStroke {
  strokeId: string
  odUserId: string
  color: string
  width: number
  points: Point[]
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
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Refs for real-time sync (avoid re-renders)
  const liveStrokesRef = useRef<Map<string, LiveStroke>>(new Map())
  const currentStrokeIdRef = useRef<string>('')
  const currentStrokePointsRef = useRef<Point[]>([])
  const strokesRef = useRef<Stroke[]>([])
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string>('')

  // Pending ACKs for retry mechanism
  const pendingAcksRef = useRef<Map<string, {
    data: { roomId: string; stroke: Stroke; messageId: string };
    retries: number;
    timeout: NodeJS.Timeout;
  }>>(new Map())

  // Sync interval (ms)
  const SYNC_INTERVAL = 50

  // ACK timeout and retry settings
  const ACK_TIMEOUT = 2000  // 2 seconds
  const MAX_RETRIES = 2

  // Animation frame ref for smooth rendering
  const rafRef = useRef<number | null>(null)
  const needsRedrawRef = useRef(false)
  const lastSyncedPointsRef = useRef<Map<string, number>>(new Map())

  // Periodic sync interval
  const RECONCILE_INTERVAL = 3000  // 3 seconds
  const reconcileIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStrokeCountRef = useRef<number>(0)

  // Send stroke-complete with ACK and retry
  const sendStrokeCompleteWithRetry = useCallback((stroke: Stroke) => {
    const socket = getSocket()
    if (!socket.connected) return

    const messageId = `${userIdRef.current}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const sendData = {
      roomId,
      stroke,
      messageId,
    }

    const attemptSend = (retryCount: number) => {
      socket.emit('stroke-complete', sendData)

      // Set timeout for ACK
      const timeout = setTimeout(() => {
        const pending = pendingAcksRef.current.get(messageId)
        if (pending && pending.retries < MAX_RETRIES) {
          pending.retries++
          attemptSend(pending.retries)
        } else if (pending) {
          pendingAcksRef.current.delete(messageId)
        }
      }, ACK_TIMEOUT)

      pendingAcksRef.current.set(messageId, {
        data: sendData,
        retries: retryCount,
        timeout,
      })
    }

    attemptSend(0)
  }, [roomId])

  // Keep strokes ref in sync
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  // Get user ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        userIdRef.current = parsed.user?.id || `anon-${Date.now()}`
      } catch {
        userIdRef.current = `anon-${Date.now()}`
      }
    } else {
      userIdRef.current = `anon-${Date.now()}`
    }
  }, [])

  // Full canvas redraw (only called when necessary)
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

      // Handle fill strokes
      if (stroke.tool === 'fill' && points.length === 1) {
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
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(currentStrokePointsRef.current[0].x, currentStrokePointsRef.current[0].y)
      for (let i = 1; i < currentStrokePointsRef.current.length; i++) {
        ctx.lineTo(currentStrokePointsRef.current[i].x, currentStrokePointsRef.current[i].y)
      }
      ctx.stroke()
    }
  }, [color, brushSize, tool])

  // Fast incremental draw for local drawing (just add new segment)
  const drawSegment = useCallback((from: Point, to: Point, strokeColor: string, strokeWidth: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }, [])

  // Incremental draw for live strokes (draw only new points)
  const drawLiveStrokeIncremental = useCallback((strokeId: string, liveStroke: LiveStroke) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lastDrawn = lastSyncedPointsRef.current.get(strokeId) || 0
    const points = liveStroke.points

    if (points.length < 2 || lastDrawn >= points.length - 1) return

    ctx.strokeStyle = liveStroke.color
    ctx.lineWidth = liveStroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const startIdx = Math.max(lastDrawn, 1)
    ctx.beginPath()
    ctx.moveTo(points[startIdx - 1].x, points[startIdx - 1].y)
    for (let i = startIdx; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()

    lastSyncedPointsRef.current.set(strokeId, points.length - 1)
  }, [])

  const loadStrokes = useCallback(async () => {
    if (!roomId) return

    try {
      const data = await apiClient.getStrokes(roomId)
      const loadedStrokes = data.strokes || []
      setStrokes(loadedStrokes)
      strokesRef.current = loadedStrokes
      lastStrokeCountRef.current = loadedStrokes.length
      redrawCanvas()
      onStrokesChange?.(loadedStrokes)
    } catch (err) {
      console.error('Failed to load strokes:', err)
    }
  }, [roomId, redrawCanvas, onStrokesChange])

  // Reconcile: fetch from DB and merge any missing strokes
  const reconcileStrokes = useCallback(async () => {
    if (!roomId) return

    try {
      const data = await apiClient.getStrokes(roomId)
      const serverStrokes: Stroke[] = data.strokes || []

      // Check if we have all strokes
      const currentIds = new Set(strokesRef.current.map(s => s.id))
      const missingStrokes = serverStrokes.filter(s => !currentIds.has(s.id))

      if (missingStrokes.length > 0) {
        // Add missing strokes
        const updated = [...strokesRef.current, ...missingStrokes]
        // Sort by createdAt to maintain order
        updated.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()
          return dateA - dateB
        })

        setStrokes(updated)
        strokesRef.current = updated
        lastStrokeCountRef.current = updated.length
        redrawCanvas()
        onStrokesChange?.(updated)
      }

      // Also check if server has fewer (someone cleared)
      if (serverStrokes.length < strokesRef.current.length) {
        // Server has fewer - someone might have cleared or deleted
        // Use server as source of truth
        setStrokes(serverStrokes)
        strokesRef.current = serverStrokes
        lastStrokeCountRef.current = serverStrokes.length
        redrawCanvas()
        onStrokesChange?.(serverStrokes)
      }
    } catch (err) {
      // Silently fail - will retry next interval
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

  // Send current stroke points to other users
  const syncStrokePoints = useCallback(() => {
    if (!currentStrokeIdRef.current || currentStrokePointsRef.current.length === 0) return

    const socket = getSocket()
    if (socket.connected) {
      socket.emit('stroke-sync', {
        roomId,
        strokeId: currentStrokeIdRef.current,
        odUserId: userIdRef.current,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        width: brushSize,
        points: currentStrokePointsRef.current,
      })
    }
  }, [roomId, color, brushSize, tool])

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

      // Send with ACK and retry mechanism
      sendStrokeCompleteWithRetry(response.stroke)

      const newStrokes = [...strokes, response.stroke]
      setStrokes(newStrokes)
      strokesRef.current = newStrokes
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

    const strokeId = `${userIdRef.current}-${Date.now()}`
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

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getTouchPos(e)

    // Handle fill tool differently
    if (tool === 'fill') {
      handleFill(pos)
      return
    }

    setIsDrawing(true)

    const strokeId = `${userIdRef.current}-${Date.now()}`
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
    if (!isDrawing || tool === 'fill') return

    e.preventDefault()
    const pos = getMousePos(e)
    const points = currentStrokePointsRef.current

    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      drawSegment(lastPoint, pos, tool === 'eraser' ? '#FFFFFF' : color, brushSize)
    }

    currentStrokePointsRef.current = [...points, pos]
  }

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'fill') return

    e.preventDefault()
    const pos = getTouchPos(e)
    const points = currentStrokePointsRef.current

    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      drawSegment(lastPoint, pos, tool === 'eraser' ? '#FFFFFF' : color, brushSize)
    }

    currentStrokePointsRef.current = [...points, pos]
  }

  const endDrawing = async () => {
    if (!isDrawing || tool === 'fill') {
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

    // Final sync before ending - ensure all points are sent
    const socket = getSocket()
    if (socket.connected && strokeId && finalPoints.length > 0) {
      socket.emit('stroke-sync', {
        roomId,
        strokeId,
        odUserId: userIdRef.current,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        width: brushSize,
        points: finalPoints,
      })
    }

    // Notify stroke end
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
        color: tool === 'eraser' ? '#FFFFFF' : color,
        width: brushSize,
        points: finalPoints,
      })

      // Send with ACK and retry mechanism
      sendStrokeCompleteWithRetry(response.stroke)

      const newStrokes = [...strokesRef.current, response.stroke]
      setStrokes(newStrokes)
      strokesRef.current = newStrokes
      redrawCanvas()
      onStrokesChange?.(newStrokes)
    } catch (err) {
      console.error('Failed to save stroke:', err)
    }
  }

  const clearCanvas = useCallback(async () => {
    if (!confirm('Clear all drawings?')) return

    try {
      await apiClient.clearStrokes(roomId)

      setStrokes([])
      strokesRef.current = []
      liveStrokesRef.current.clear()
      redrawCanvas()
      onStrokesChange?.([])

      const socket = getSocket()
      if (socket.connected) {
        socket.emit('canvas-clear', { roomId })
      }
    } catch (err) {
      console.error('Failed to clear canvas:', err)
    }
  }, [roomId, redrawCanvas, onStrokesChange])

  const undo = useCallback(() => {
    setStrokes((prevStrokes) => {
      if (prevStrokes.length === 0) return prevStrokes
      const newStrokes = prevStrokes.slice(0, -1)
      strokesRef.current = newStrokes
      redrawCanvas()
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
    redrawCanvas()
  }, [canvasSize, redrawCanvas])

  // Load strokes and setup socket
  useEffect(() => {
    if (!roomId) return

    loadStrokes()

    const socket = getSocket()

    const joinRoom = () => {
      socket.emit('join-room', roomId)
    }

    // Wait for connection before joining room
    socket.on('connect', joinRoom)

    if (socket.connected) {
      joinRoom()
    } else {
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
      if (data.odUserId === userIdRef.current) return

      const liveStroke = {
        strokeId: data.strokeId,
        odUserId: data.odUserId,
        color: data.color,
        width: data.width,
        points: data.points,
      }

      liveStrokesRef.current.set(data.strokeId, liveStroke)

      // Incremental draw instead of full redraw
      drawLiveStrokeIncremental(data.strokeId, liveStroke)
    }

    // Other user finished drawing
    const handleStrokeEnd = (data: { strokeId: string }) => {
      liveStrokesRef.current.delete(data.strokeId)
      lastSyncedPointsRef.current.delete(data.strokeId)
      // Full redraw needed to clean up the live stroke
      redrawCanvas()
    }

    // Completed stroke received
    const handleStrokeComplete = (stroke: Stroke) => {
      // Remove all live strokes from the user who completed the stroke
      const userId = stroke.user?.id || stroke.userId
      if (userId) {
        liveStrokesRef.current.forEach((liveStroke, key) => {
          if (liveStroke.odUserId === userId || key.startsWith(userId)) {
            liveStrokesRef.current.delete(key)
          }
        })
      }

      // Check if stroke already exists to prevent duplicates
      setStrokes((prev) => {
        if (prev.some(s => s.id === stroke.id)) {
          return prev
        }
        const updated = [...prev, stroke]
        strokesRef.current = updated
        onStrokesChange?.(updated)
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
      onStrokesChange?.([])
    }

    // Handle ACK for stroke-complete
    const handleStrokeCompleteAck = (data: { messageId: string; strokeId: string; success: boolean }) => {
      const pending = pendingAcksRef.current.get(data.messageId)
      if (pending) {
        clearTimeout(pending.timeout)
        pendingAcksRef.current.delete(data.messageId)
      }
    }

    socket.on('stroke-synced', handleStrokeSync)
    socket.on('stroke-ended', handleStrokeEnd)
    socket.on('stroke-completed', handleStrokeComplete)
    socket.on('canvas-cleared', handleCanvasCleared)
    socket.on('stroke-complete-ack', handleStrokeCompleteAck)

    // Start periodic reconciliation (failsafe sync)
    reconcileIntervalRef.current = setInterval(() => {
      reconcileStrokes()
    }, RECONCILE_INTERVAL)

    return () => {
      socket.emit('leave-room', roomId)
      socket.off('connect', joinRoom)
      socket.off('stroke-synced', handleStrokeSync)
      socket.off('stroke-ended', handleStrokeEnd)
      socket.off('stroke-completed', handleStrokeComplete)
      socket.off('canvas-cleared', handleCanvasCleared)
      socket.off('stroke-complete-ack', handleStrokeCompleteAck)

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }

      // Clear pending ACKs
      pendingAcksRef.current.forEach((pending) => {
        clearTimeout(pending.timeout)
      })
      pendingAcksRef.current.clear()

      // Clear reconciliation interval
      if (reconcileIntervalRef.current) {
        clearInterval(reconcileIntervalRef.current)
        reconcileIntervalRef.current = null
      }
    }
  }, [roomId, loadStrokes, redrawCanvas, onStrokesChange, drawLiveStrokeIncremental, reconcileStrokes])

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
