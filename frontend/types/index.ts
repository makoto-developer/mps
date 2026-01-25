// User types
export interface User {
  id: string
  email: string
  nickname: string
  role: string
}

// Active user in room with tool state
export interface RoomParticipant {
  id: string
  nickname: string
  tool: 'pen' | 'eraser' | 'fill' | 'none'
  color: string
  cursorPosition?: Point
}

// Room with active users
export interface RoomWithParticipants extends Room {
  participants: RoomParticipant[]
  participantCount: number
}

// Room types
export interface Room {
  id: string
  title: string
  theme: string
  createdAt?: string
  ownerId?: string
}

// Message types
export interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    nickname: string
  }
}

// Drawing types
export interface Point {
  x: number
  y: number
}

export type DrawingTool = 'pen' | 'eraser' | 'fill' | 'none'

export interface Stroke {
  id: string
  tool: DrawingTool
  color: string
  width: number
  points: Point[]
  createdAt?: string | Date
  userId?: string
  user: {
    id: string
    nickname: string
  }
}

// Auth types
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  nickname: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AuthResponse {
  success: boolean
  user: User
  token: string
}

export interface RoomsResponse {
  rooms: Room[]
}

export interface MessagesResponse {
  messages: Message[]
}

export interface StrokesResponse {
  strokes: Stroke[]
}
