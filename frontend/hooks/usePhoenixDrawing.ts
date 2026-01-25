'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  joinRoom,
  leaveRoom,
  sendStrokeSync,
  sendStrokeEnd,
  sendStrokeComplete,
  requestStrokes,
  clearCanvas as clearCanvasPhoenix,
  Stroke,
  LiveStroke,
  RoomState
} from '@/lib/phoenix-socket'

interface Point {
  x: number
  y: number
}

interface UsePhoenixDrawingProps {
  roomId: string
  onStrokesChange?: (strokes: Stroke[]) => void
}

export function usePhoenixDrawing({ roomId, onStrokesChange }: UsePhoenixDrawingProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const strokesRef = useRef<Stroke[]>([])
  const liveStrokesRef = useRef<Map<string, LiveStroke>>(new Map())
  const currentStrokeIdRef = useRef<string>('')
  const currentStrokePointsRef = useRef<Point[]>([])
  const userIdRef = useRef<string>('')
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconcileIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastClearTimestampRef = useRef<number>(0)

  const SYNC_INTERVAL = 50
  const RECONCILE_INTERVAL = 5000

  // Callbacks for UI updates
  const redrawCallbackRef = useRef<(() => void) | null>(null)

  // Set redraw callback
  const setRedrawCallback = useCallback((callback: () => void) => {
    redrawCallbackRef.current = callback
  }, [])

  // Trigger redraw
  const triggerRedraw = useCallback(() => {
    redrawCallbackRef.current?.()
  }, [])

  // Get user ID
  useEffect(() => {
    try {
      const auth = localStorage.getItem('auth')
      if (auth) {
        const parsed = JSON.parse(auth)
        userIdRef.current = parsed.user?.id || `anon-${Date.now()}`
      } else {
        userIdRef.current = `anon-${Date.now()}`
      }
    } catch {
      userIdRef.current = `anon-${Date.now()}`
    }
  }, [])

  // Keep strokes ref in sync
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  // Join room and setup handlers
  useEffect(() => {
    if (!roomId) return

    console.log('[usePhoenixDrawing] Joining room:', roomId)

    const channel = joinRoom(roomId, {
      onRoomState: (state: RoomState) => {
        console.log('[usePhoenixDrawing] Room state received:', state.strokes.length, 'strokes')
        setStrokes(state.strokes)
        strokesRef.current = state.strokes
        onStrokesChange?.(state.strokes)

        // Restore live strokes
        state.live_strokes.forEach((ls) => {
          liveStrokesRef.current.set(ls.stroke_id, ls)
        })

        triggerRedraw()
        setIsConnected(true)
      },

      onStrokeSynced: (data) => {
        if (data.user_id === userIdRef.current) return

        liveStrokesRef.current.set(data.stroke_id, {
          stroke_id: data.stroke_id,
          user_id: data.user_id,
          color: data.color,
          width: data.width,
          points: data.points
        })

        triggerRedraw()
      },

      onStrokeEnded: (data) => {
        liveStrokesRef.current.delete(data.stroke_id)
        triggerRedraw()
      },

      onStrokeCompleted: (stroke) => {
        // Remove live stroke
        liveStrokesRef.current.forEach((ls, key) => {
          if (ls.user_id === stroke.user_id) {
            liveStrokesRef.current.delete(key)
          }
        })

        // If this is our own stroke, clear the current stroke points
        if (stroke.user_id === userIdRef.current) {
          currentStrokePointsRef.current = []
        }

        // Ignore strokes created before the last clear
        if (stroke.created_at < lastClearTimestampRef.current) {
          triggerRedraw()
          return
        }

        // Add to strokes if not exists
        setStrokes((prev) => {
          if (prev.some(s => s.id === stroke.id)) {
            return prev
          }
          const updated = [...prev, stroke]
          strokesRef.current = updated
          onStrokesChange?.(updated)
          return updated
        })

        triggerRedraw()
      },

      onCanvasCleared: () => {
        // Record the clear timestamp to ignore old strokes
        lastClearTimestampRef.current = Date.now()

        setStrokes([])
        strokesRef.current = []
        liveStrokesRef.current.clear()
        currentStrokePointsRef.current = []
        currentStrokeIdRef.current = ''
        onStrokesChange?.([])
        triggerRedraw()
      }
    })

    // Periodic reconciliation
    reconcileIntervalRef.current = setInterval(() => {
      requestStrokes(roomId, (serverStrokes) => {
        // Filter out strokes created before the last clear
        const validServerStrokes = serverStrokes.filter(
          s => s.created_at >= lastClearTimestampRef.current
        )

        const currentIds = new Set(strokesRef.current.map(s => s.id))
        const missingStrokes = validServerStrokes.filter(s => !currentIds.has(s.id))

        if (missingStrokes.length > 0) {
          const updated = [...strokesRef.current, ...missingStrokes]
          updated.sort((a, b) => a.created_at - b.created_at)
          setStrokes(updated)
          strokesRef.current = updated
          onStrokesChange?.(updated)
          triggerRedraw()
        }
      })
    }, RECONCILE_INTERVAL)

    return () => {
      leaveRoom(roomId)
      setIsConnected(false)

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      if (reconcileIntervalRef.current) {
        clearInterval(reconcileIntervalRef.current)
      }
    }
  }, [roomId, onStrokesChange, triggerRedraw])

  // Start drawing
  const startStroke = useCallback((point: Point, color: string, width: number) => {
    const strokeId = `${userIdRef.current}-${Date.now()}`
    currentStrokeIdRef.current = strokeId
    currentStrokePointsRef.current = [point]

    // Start sync interval
    syncIntervalRef.current = setInterval(() => {
      if (currentStrokeIdRef.current && currentStrokePointsRef.current.length > 0) {
        sendStrokeSync(roomId, {
          stroke_id: currentStrokeIdRef.current,
          color,
          width,
          points: currentStrokePointsRef.current
        })
      }
    }, SYNC_INTERVAL)

    // Initial sync
    sendStrokeSync(roomId, {
      stroke_id: strokeId,
      color,
      width,
      points: [point]
    })
  }, [roomId])

  // Continue drawing
  const continueStroke = useCallback((point: Point) => {
    currentStrokePointsRef.current = [...currentStrokePointsRef.current, point]
  }, [])

  // End drawing
  const endStroke = useCallback((tool: string, color: string, width: number) => {
    // Stop sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    const finalPoints = [...currentStrokePointsRef.current]
    const strokeId = currentStrokeIdRef.current

    // Final sync
    if (strokeId && finalPoints.length > 0) {
      sendStrokeSync(roomId, {
        stroke_id: strokeId,
        color,
        width,
        points: finalPoints
      })

      // Send stroke end
      sendStrokeEnd(roomId, strokeId)
    }

    // Don't clear currentStrokePointsRef yet - keep it visible until stroke_completed arrives
    // It will be cleared when we receive our own stroke back from the server
    currentStrokeIdRef.current = ''

    if (finalPoints.length < 2) {
      currentStrokePointsRef.current = []
      return null
    }

    // Send completed stroke
    const stroke = {
      tool,
      color,
      width,
      points: finalPoints
    }

    sendStrokeComplete(roomId, stroke)

    // Note: Server broadcasts to ALL users including sender,
    // so we'll receive the stroke via onStrokeCompleted callback
    // currentStrokePointsRef will be cleared in onStrokeCompleted

    return stroke
  }, [roomId])

  // Clear canvas
  const clearCanvas = useCallback(() => {
    clearCanvasPhoenix(roomId)
  }, [roomId])

  // Getters for refs
  const getStrokes = useCallback(() => strokesRef.current, [])
  const getLiveStrokes = useCallback(() => liveStrokesRef.current, [])
  const getCurrentStrokePoints = useCallback(() => currentStrokePointsRef.current, [])

  return {
    strokes,
    isConnected,
    startStroke,
    continueStroke,
    endStroke,
    clearCanvas,
    getStrokes,
    getLiveStrokes,
    getCurrentStrokePoints,
    setRedrawCallback
  }
}
