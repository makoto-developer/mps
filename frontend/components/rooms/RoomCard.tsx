'use client'

import Link from 'next/link'
import { RoomWithParticipants, RoomParticipant } from '@/types'
import { Card, CardBody, Button } from '@/components/ui'

interface RoomCardProps {
  room: RoomWithParticipants
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
  ]
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getInitials(nickname: string): string {
  return nickname
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function ParticipantAvatar({ participant }: { participant: RoomParticipant }) {
  return (
    <div
      className={`w-7 h-7 ${getUserColor(participant.id)} rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm`}
      title={`${participant.nickname} - ${participant.tool === 'none' ? 'Idle' : participant.tool}`}
    >
      {getInitials(participant.nickname)}
    </div>
  )
}

function ToolIndicator({ tool }: { tool: RoomParticipant['tool'] }) {
  const toolIcons: Record<RoomParticipant['tool'], string> = {
    pen: '✏️',
    eraser: '🧹',
    fill: '🪣',
    none: '👀',
  }
  return <span className="text-xs">{toolIcons[tool]}</span>
}

export function RoomCard({ room }: RoomCardProps) {
  const participants = room.participants || []
  const participantCount = room.participantCount || participants.length
  const displayParticipants = participants.slice(0, 5)
  const remainingCount = participantCount - displayParticipants.length

  return (
    <Card hoverable className="h-full flex flex-col">
      <CardBody className="flex flex-col flex-1 p-6">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {room.title}
            </h3>
            {participantCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {participantCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {room.theme}
          </p>

          {/* Active participants */}
          {participants.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Active now:</p>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {displayParticipants.map((participant) => (
                    <ParticipantAvatar key={participant.id} participant={participant} />
                  ))}
                </div>
                {remainingCount > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    +{remainingCount} more
                  </span>
                )}
              </div>
              {/* Tool indicators */}
              <div className="flex flex-wrap gap-2 mt-2">
                {displayParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-1 text-xs text-gray-600"
                  >
                    <ToolIndicator tool={participant.tool} />
                    <span className="truncate max-w-[60px]">{participant.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link href={`/rooms/${room.id}`}>
          <Button variant="primary" size="sm" className="w-full">
            {participantCount > 0 ? 'Join Room' : 'Enter Room'}
          </Button>
        </Link>
      </CardBody>
    </Card>
  )
}
