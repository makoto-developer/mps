'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      const socketInstance = connectSocket()
      setSocket(socketInstance)

      socketInstance.on('connect', () => {
        setIsConnected(true)
      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)
      })

      return () => {
        disconnectSocket()
        setSocket(null)
        setIsConnected(false)
      }
    } else {
      disconnectSocket()
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated])

  const joinRoom = (roomId: string) => {
    if (socket?.connected) {
      socket.emit('join-room', roomId)
    }
  }

  const leaveRoom = (roomId: string) => {
    if (socket?.connected) {
      socket.emit('leave-room', roomId)
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
