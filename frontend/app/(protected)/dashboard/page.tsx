'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui'
import { RoomGrid } from '@/components/rooms'

export default function DashboardPage() {
  const { user } = useAuth()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="app" />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.nickname}! 👋
            </h1>
            <p className="text-gray-600">
              Ready to create or join a drawing room?
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Link href="/rooms/create">
              <Button variant="primary" size="lg">
                ➕ Create New Room
              </Button>
            </Link>
            <Button variant="outline" size="lg" onClick={handleRefresh}>
              🔄 Refresh Rooms
            </Button>
          </div>

          {/* Room list */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Available Rooms
            </h2>
            <RoomGrid refreshTrigger={refreshTrigger} />
          </section>
        </div>
      </main>
    </div>
  )
}
