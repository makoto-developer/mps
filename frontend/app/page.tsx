'use client'

import { useState, useEffect } from 'react'
import { UserRegistration } from '@/components/UserRegistration'
import { RoomList } from '@/components/RoomList'
import { RoomCreate } from '@/components/RoomCreate'
import { RoomMessages } from '@/components/RoomMessages'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { apiClient } from '@/lib/api-client'

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{
    id: string
    email: string
    nickname: string
    role: string
  } | null>(null)
  const [refreshRooms, setRefreshRooms] = useState(0)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  useEffect(() => {
    const user = apiClient.getUser()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  const handleUserCreated = (user: { id: string; email: string; nickname: string; role: string }) => {
    setCurrentUser(user)
  }

  const handleRoomCreated = () => {
    setRefreshRooms((prev) => prev + 1)
  }

  const handleLogout = () => {
    apiClient.clearAuth()
    setCurrentUser(null)
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Drawing App
          </h1>
          <p className="text-gray-600">
            Create and join collaborative drawing rooms
          </p>

          {currentUser && (
            <div className="mt-4 inline-flex items-center gap-4 bg-white px-6 py-3 rounded-lg shadow">
              <span className="text-sm text-gray-600">
                Logged in as <strong className="text-gray-800">{currentUser.nickname}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {!currentUser ? (
            <section className="bg-white rounded-xl shadow-lg p-8 md:col-span-2">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                User Registration
              </h2>
              <UserRegistration onUserCreated={handleUserCreated} />
            </section>
          ) : (
            <>
              <section className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                  Create Room
                </h2>
                <RoomCreate currentUser={currentUser} onRoomCreated={handleRoomCreated} />
              </section>

              <section className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                  Rooms
                </h2>
                <RoomList 
                  currentUser={currentUser} 
                  refreshTrigger={refreshRooms}
                  onRoomSelect={setSelectedRoomId}
                />
              </section>

{selectedRoomId && (
                <>
                  <section className="bg-white rounded-xl shadow-lg p-8 md:col-span-2">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">
                      Drawing Canvas
                    </h2>
                    <DrawingCanvas roomId={selectedRoomId} currentUser={currentUser} />
                  </section>

                  <section className="bg-white rounded-xl shadow-lg p-8 md:col-span-2">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">
                      Room Chat
                    </h2>
                    <RoomMessages roomId={selectedRoomId} currentUser={currentUser} />
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
