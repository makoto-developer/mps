'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { getSocket } from '@/lib/socket'
import { Message, User } from '@/types'

interface ChatPanelProps {
  roomId: string
  currentUser: User | null
}

// Generate a consistent color based on user id
function getUserColor(userId: string): string {
  const colors = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ]
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Get initials from nickname
function getInitials(nickname: string): string {
  return nickname
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Avatar component
function Avatar({ nickname, userId, size = 'md' }: { nickname: string; userId: string; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
  return (
    <div
      className={`${sizeClasses} ${getUserColor(userId)} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}
    >
      {getInitials(nickname)}
    </div>
  )
}

export function ChatPanel({ roomId, currentUser }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async () => {
    if (!roomId) return

    setLoading(true)

    try {
      const data = await apiClient.getMessages(roomId)
      setMessages(data.messages || [])
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }, [roomId, scrollToBottom])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !currentUser) return

    setSending(true)

    try {
      const data = await apiClient.sendMessage(roomId, { content: newMessage })

      const socket = getSocket()
      if (socket.connected) {
        socket.emit('send-message', {
          roomId,
          message: data.message,
        })
      }

      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!roomId || !currentUser) return

    loadMessages()

    const socket = getSocket()
    socket.connect()
    socket.emit('join-room', roomId)

    socket.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message])
      setTimeout(scrollToBottom, 100)
    })

    return () => {
      socket.off('new-message')
    }
  }, [roomId, currentUser, loadMessages, scrollToBottom])

  // Check if message is from same user as previous
  const isSameUser = (index: number) => {
    if (index === 0) return false
    return messages[index].user.id === messages[index - 1].user.id
  }

  // Check if there's a time gap (more than 5 minutes)
  const hasTimeGap = (index: number) => {
    if (index === 0) return true
    const current = new Date(messages[index].createdAt).getTime()
    const previous = new Date(messages[index - 1].createdAt).getTime()
    return current - previous > 5 * 60 * 1000
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="font-semibold text-white">Chat</h3>
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
            {messages.length}
          </span>
        </div>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-4xl mb-3">💭</div>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.user.id === currentUser?.id
            const sameUser = isSameUser(index) && !hasTimeGap(index)
            const showTime = hasTimeGap(index)

            return (
              <div key={message.id}>
                {/* Time separator */}
                {showTime && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                    sameUser ? 'mt-0.5' : 'mt-3'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 ${sameUser ? 'invisible' : ''}`}>
                    {!isOwn && (
                      <Avatar
                        nickname={message.user.nickname}
                        userId={message.user.id}
                        size="md"
                      />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`group max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}
                  >
                    {/* Username */}
                    {!isOwn && !sameUser && (
                      <div className="text-xs font-medium text-gray-500 mb-1 ml-1">
                        {message.user.nickname}
                      </div>
                    )}

                    <div
                      className={`relative px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-primary-600 text-white rounded-br-md'
                          : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      
                      {/* Hover timestamp */}
                      <div
                        className={`absolute bottom-0 ${
                          isOwn ? '-left-12' : '-right-12'
                        } opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 whitespace-nowrap`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={!currentUser || sending}
              className="w-full px-4 py-2.5 text-sm bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors disabled:opacity-50 pr-12"
            />
          </div>
          <button
            type="submit"
            disabled={!currentUser || sending || !newMessage.trim()}
            className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
