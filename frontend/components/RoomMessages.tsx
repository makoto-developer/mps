'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'

interface RoomMessagesProps {
  roomId: string
  currentUser: { id: string; nickname: string } | null
}

interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    nickname: string
  }
}

export function RoomMessages({ roomId, currentUser }: RoomMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    if (!roomId) return

    setLoading(true)
    setError('')

    try {
      const data = await apiClient.getMessages(roomId)
      setMessages(data.messages || [])
      scrollToBottom()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load messages')
      } else {
        setError('Failed to load messages')
      }
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !currentUser) return

    setSending(true)
    setError('')

    try {
      const data = await apiClient.sendMessage(roomId, { content: newMessage })
      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
      scrollToBottom()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to send message')
      } else {
        setError('Failed to send message')
      }
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    loadMessages()
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [roomId])

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Messages</h3>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4 space-y-3 max-h-96">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.user.id === currentUser?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.user.id === currentUser?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <div className="text-xs font-semibold mb-1">
                  {message.user.nickname}
                </div>
                <div className="text-sm">{message.content}</div>
                <div className="text-xs mt-1 opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {currentUser ? (
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      ) : (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm text-center">
          Please log in to send messages
        </div>
      )}
    </div>
  )
}
