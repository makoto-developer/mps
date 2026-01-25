'use client'

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { usePhoenixDrawing } from '@/hooks/usePhoenixDrawing'
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

  const fillRGB = hexToRGB(fillColor)
  if (!fillRGB) return null

  const startPos = (Math.floor(startY) * canvas.width + Math.floor(startX)) * 4
  const startR = data[startPos]
  const startG = data[startPos + 1]
  const startB = data[startPos + 2]
  const startA = data[startPos + 3]

  if (startR === fillRGB.r && startG === fillRGB.g && startB === fillRGB.b && startA === 255) {
    return null
  }

  const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]]
  const visited = new Set<string>()
  const tolerance = 32

  const matchesStart = (pos: number): boolean => {
    return (
      Math.abs(data[pos] - startR) <= tolerance &&
      Math.abs(data[pos + 1] - startG) <= tolerance &&
      Math.abs(data[pos + 2] - startB) <= tolerance &&
      Math.abs(data[pos + 3] - startA) <= tolerance
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
    data[pos] = fillRGB.r
    data[pos + 1] = fillRGB.g
    data[pos + 2] = fillRGB.b
    data[pos + 3] = 255

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  return imageData
}

function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null
}

export const PhoenixDrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function PhoenixDrawingCanvas({ roomId, color, brushSize, tool, onStrokesChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

    const {
      strokes,
      isConnected,
      startStroke,
      continueStroke,
      endStroke,
      clearCanvas: clearCanvasPhoenix,
      getStrokes,
      getLiveStrokes,
      getCurrentStrokePoints,
      setRedrawCallback
    } = usePhoenixDrawing({ roomId, onStrokesChange })

    // Full canvas redraw
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw completed strokes
      getStrokes().forEach((stroke: Stroke) => {
        const points = typeof stroke.points === 'string' ? JSON.parse(stroke.points) : stroke.points

        if (stroke.tool === 'fill' && points.length === 1) {
          const filledImageData = floodFill(ctx, points[0].x, points[0].y, stroke.color, canvas)
          if (filledImageData) ctx.putImageData(filledImageData, 0, 0)
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
      getLiveStrokes().forEach((liveStroke) => {
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
      const currentPoints = getCurrentStrokePoints()
      if (currentPoints.length >= 2) {
        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
        ctx.lineWidth = brushSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y)
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y)
        }
        ctx.stroke()
      }
    }, [color, brushSize, tool, getStrokes, getLiveStrokes, getCurrentStrokePoints])

    // Register redraw callback
    useEffect(() => {
      setRedrawCallback(redrawCanvas)
    }, [setRedrawCallback, redrawCanvas])

    // Redraw when strokes change
    useEffect(() => {
      redrawCanvas()
    }, [strokes, redrawCanvas])

    // Redraw when canvas size changes
    useEffect(() => {
      redrawCanvas()
    }, [canvasSize, redrawCanvas])

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
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
        y: (touch.clientY - rect.top) * scaleY
      }
    }

    // Fast incremental draw
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

    // Handle fill
    const handleFill = async (pos: Point) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const filledImageData = floodFill(ctx, pos.x, pos.y, color, canvas)
      if (!filledImageData) return

      ctx.putImageData(filledImageData, 0, 0)

      // TODO: Save fill stroke via Phoenix
    }

    const handleStartDrawing = (pos: Point) => {
      if (tool === 'fill') {
        handleFill(pos)
        return
      }

      setIsDrawing(true)
      startStroke(pos, tool === 'eraser' ? '#FFFFFF' : color, brushSize)
      redrawCanvas()
    }

    const handleDraw = (pos: Point) => {
      if (!isDrawing || tool === 'fill') return

      const currentPoints = getCurrentStrokePoints()
      if (currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1]
        drawSegment(lastPoint, pos, tool === 'eraser' ? '#FFFFFF' : color, brushSize)
      }

      continueStroke(pos)
    }

    const handleEndDrawing = () => {
      if (!isDrawing || tool === 'fill') {
        setIsDrawing(false)
        return
      }

      setIsDrawing(false)
      endStroke(tool, tool === 'eraser' ? '#FFFFFF' : color, brushSize)
      redrawCanvas()
    }

    // Mouse events
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      handleStartDrawing(getMousePos(e))
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      handleDraw(getMousePos(e))
    }

    const endDrawing = () => handleEndDrawing()

    // Touch events
    const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      handleStartDrawing(getTouchPos(e))
    }

    const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      handleDraw(getTouchPos(e))
    }

    // Clear canvas
    const clearCanvasHandler = useCallback(async () => {
      if (!confirm('Clear all drawings?')) return
      clearCanvasPhoenix()
    }, [clearCanvasPhoenix])

    // Undo (local only for now)
    const undo = useCallback(() => {
      // TODO: Implement undo via Phoenix
    }, [])

    // Expose methods
    useImperativeHandle(ref, () => ({
      clearCanvas: clearCanvasHandler,
      undo
    }), [clearCanvasHandler, undo])

    // Handle resize
    useEffect(() => {
      const handleResize = () => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect()
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
        }
      }

      handleResize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    const getCursorStyle = () => {
      switch (tool) {
        case 'fill': return 'crosshair'
        case 'eraser': return 'cell'
        default: return 'crosshair'
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
            cursor: getCursorStyle()
          }}
        />
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white px-4 py-2 rounded shadow">Connecting to Phoenix...</div>
          </div>
        )}
      </div>
    )
  }
)
