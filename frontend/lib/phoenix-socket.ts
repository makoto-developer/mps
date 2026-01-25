import { Socket, Channel } from 'phoenix'

const PHOENIX_URL = process.env.NEXT_PUBLIC_PHOENIX_URL || 'ws://localhost:22303/socket'

let socket: Socket | null = null
let channels: Map<string, Channel> = new Map()

export interface Stroke {
  id: string
  room_id: string
  user_id: string
  tool: string
  color: string
  width: number
  points: Array<{ x: number; y: number }>
  created_at: number
}

export interface LiveStroke {
  stroke_id: string
  user_id: string
  color: string
  width: number
  points: Array<{ x: number; y: number }>
}

export interface RoomState {
  strokes: Stroke[]
  live_strokes: LiveStroke[]
}

/**
 * Get or create Phoenix Socket connection
 */
export function getPhoenixSocket(): Socket {
  if (!socket) {
    // Get user ID from localStorage
    let userId = 'anonymous'
    try {
      const auth = localStorage.getItem('auth')
      if (auth) {
        const parsed = JSON.parse(auth)
        userId = parsed.user?.id || 'anonymous'
      }
    } catch {
      // ignore
    }

    socket = new Socket(PHOENIX_URL, {
      params: { user_id: userId }
    })
  }
  return socket
}

/**
 * Connect to Phoenix Socket
 */
export function connectPhoenixSocket(): Socket {
  const sock = getPhoenixSocket()
  if (!sock.isConnected()) {
    console.log('[Phoenix] Connecting to:', PHOENIX_URL)

    sock.onOpen(() => {
      console.log('[Phoenix] Socket connected')
    })

    sock.onError((err) => {
      console.error('[Phoenix] Socket error:', err)
    })

    sock.onClose(() => {
      console.log('[Phoenix] Socket closed')
    })

    sock.connect()
  }
  return sock
}

/**
 * Join a room channel
 */
export function joinRoom(roomId: string, callbacks: {
  onRoomState?: (state: RoomState) => void
  onStrokeSynced?: (data: LiveStroke & { stroke_id: string }) => void
  onStrokeEnded?: (data: { stroke_id: string }) => void
  onStrokeCompleted?: (stroke: Stroke) => void
  onCanvasCleared?: () => void
  onPeerJoined?: (data: { user_id: string; socket_id: string }) => void
  onPeerLeft?: (data: { user_id: string; socket_id: string }) => void
}): Channel {
  const sock = connectPhoenixSocket()

  // Check if already joined
  const existingChannel = channels.get(roomId)
  if (existingChannel) {
    return existingChannel
  }

  const channel = sock.channel(`room:${roomId}`, {})

  // Room state on join
  channel.on('room_state', (state: RoomState) => {
    callbacks.onRoomState?.(state)
  })

  // Real-time stroke sync
  channel.on('stroke_synced', (data) => {
    callbacks.onStrokeSynced?.(data)
  })

  // Stroke ended
  channel.on('stroke_ended', (data) => {
    callbacks.onStrokeEnded?.(data)
  })

  // Stroke completed
  channel.on('stroke_completed', (stroke: Stroke) => {
    callbacks.onStrokeCompleted?.(stroke)
  })

  // Canvas cleared
  channel.on('canvas_cleared', () => {
    callbacks.onCanvasCleared?.()
  })

  // Peer events
  channel.on('peer-joined', (data) => {
    callbacks.onPeerJoined?.(data)
  })

  channel.on('peer-left', (data) => {
    callbacks.onPeerLeft?.(data)
  })

  // ACK handler
  channel.on('stroke_complete_ack', (data) => {
    // Handle ACK - clear pending retry
    const pending = pendingAcks.get(data.message_id)
    if (pending) {
      clearTimeout(pending.timeout)
      pendingAcks.delete(data.message_id)
    }
  })

  // Strokes list (for reconciliation)
  channel.on('strokes_list', (data) => {
    // This is handled by the reconciliation callback
    if (reconciliationCallback) {
      reconciliationCallback(data.strokes)
    }
  })

  console.log(`[Phoenix] Joining room: ${roomId}`)

  channel.join()
    .receive('ok', () => {
      console.log(`[Phoenix] Joined room ${roomId} successfully`)
    })
    .receive('error', (err) => {
      console.error(`[Phoenix] Failed to join room ${roomId}:`, err)
    })
    .receive('timeout', () => {
      console.error(`[Phoenix] Timeout joining room ${roomId}`)
    })

  channels.set(roomId, channel)
  return channel
}

/**
 * Leave a room channel
 */
export function leaveRoom(roomId: string): void {
  const channel = channels.get(roomId)
  if (channel) {
    channel.leave()
    channels.delete(roomId)
  }
}

// Pending ACKs for retry
const pendingAcks = new Map<string, { timeout: NodeJS.Timeout; retries: number }>()
const ACK_TIMEOUT = 2000
const MAX_RETRIES = 2

// Reconciliation callback
let reconciliationCallback: ((strokes: Stroke[]) => void) | null = null

/**
 * Send stroke sync (real-time points during drawing)
 */
export function sendStrokeSync(roomId: string, data: {
  stroke_id: string
  color: string
  width: number
  points: Array<{ x: number; y: number }>
}): void {
  const channel = channels.get(roomId)
  if (channel) {
    channel.push('stroke_sync', data)
  }
}

/**
 * Send stroke end (drawing finished)
 */
export function sendStrokeEnd(roomId: string, strokeId: string): void {
  const channel = channels.get(roomId)
  if (channel) {
    channel.push('stroke_end', { stroke_id: strokeId })
  }
}

/**
 * Send completed stroke with ACK and retry
 */
export function sendStrokeComplete(roomId: string, stroke: {
  id?: string
  tool: string
  color: string
  width: number
  points: Array<{ x: number; y: number }>
}): void {
  const channel = channels.get(roomId)
  if (!channel) return

  const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const attemptSend = (retries: number) => {
    channel.push('stroke_complete', {
      message_id: messageId,
      stroke: stroke
    })

    const timeout = setTimeout(() => {
      const pending = pendingAcks.get(messageId)
      if (pending && pending.retries < MAX_RETRIES) {
        pending.retries++
        attemptSend(pending.retries)
      } else {
        pendingAcks.delete(messageId)
      }
    }, ACK_TIMEOUT)

    pendingAcks.set(messageId, { timeout, retries })
  }

  attemptSend(0)
}

/**
 * Request strokes for reconciliation
 */
export function requestStrokes(roomId: string, callback: (strokes: Stroke[]) => void): void {
  const channel = channels.get(roomId)
  if (channel) {
    reconciliationCallback = callback
    channel.push('get_strokes', {})
  }
}

/**
 * Clear canvas
 */
export function clearCanvas(roomId: string): void {
  const channel = channels.get(roomId)
  if (channel) {
    channel.push('clear_canvas', {})
  }
}

/**
 * Disconnect socket
 */
export function disconnectPhoenixSocket(): void {
  channels.forEach((channel) => channel.leave())
  channels.clear()
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
