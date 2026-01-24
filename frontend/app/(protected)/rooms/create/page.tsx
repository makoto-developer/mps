'use client'

import Link from 'next/link'
import { Header } from '@/components/layout'
import { Card, CardBody } from '@/components/ui'
import { RoomCreateForm } from '@/components/rooms'

export default function CreateRoomPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="app" />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 flex items-center gap-2">
              ← Back to Dashboard
            </Link>
          </div>

          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Room
            </h1>
            <p className="text-gray-600">
              Set up a new drawing room for collaborative art
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardBody className="p-8">
              <RoomCreateForm />
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  )
}
