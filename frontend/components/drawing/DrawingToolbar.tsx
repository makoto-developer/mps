'use client'

import { Button } from '@/components/ui'
import { ColorPicker } from './ColorPicker'
import { BrushSizeSelector } from './BrushSizeSelector'
import { DrawingTool, RoomParticipant } from '@/types'

interface DrawingToolbarProps {
  color: string
  onColorChange: (color: string) => void
  brushSize: number
  onBrushSizeChange: (size: number) => void
  tool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
  onClear: () => void
  onUndo?: () => void
  disabled?: boolean
  participants?: RoomParticipant[]
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

const toolIcons: Record<DrawingTool, string> = {
  pen: '✏️',
  eraser: '🧹',
  fill: '🪣',
  none: '👀',
}

const toolLabels: Record<DrawingTool, string> = {
  pen: 'Pen',
  eraser: 'Eraser',
  fill: 'Fill',
  none: 'Idle',
}

export function DrawingToolbar({
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  tool,
  onToolChange,
  onClear,
  onUndo,
  disabled = false,
  participants = [],
}: DrawingToolbarProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Colors */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <ColorPicker value={color} onChange={onColorChange} />
        </div>

        {/* Brush Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Brush Size</label>
          <BrushSizeSelector value={brushSize} onChange={onBrushSizeChange} />
        </div>

        {/* Tools */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tool</label>
          <div className="flex gap-2">
            <Button
              variant={tool === 'pen' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onToolChange('pen')}
              disabled={disabled}
              title="Pen tool - Draw strokes"
            >
              ✏️ Pen
            </Button>
            <Button
              variant={tool === 'eraser' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onToolChange('eraser')}
              disabled={disabled}
              title="Eraser tool - Erase strokes"
            >
              🧹 Eraser
            </Button>
            <Button
              variant={tool === 'fill' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onToolChange('fill')}
              disabled={disabled}
              title="Fill tool - Fill enclosed areas"
            >
              🪣 Fill
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
          <div className="flex gap-2">
            {onUndo && (
              <Button variant="outline" size="sm" onClick={onUndo} disabled={disabled}>
                ↩️ Undo
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={onClear} disabled={disabled}>
              🗑️ Clear
            </Button>
          </div>
        </div>

        {/* Active Participants */}
        {participants.length > 0 && (
          <div className="lg:border-l lg:pl-4 lg:ml-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active ({participants.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full"
                  title={`${participant.nickname} - ${toolLabels[participant.tool]}`}
                >
                  <div
                    className={`w-5 h-5 ${getUserColor(participant.id)} rounded-full flex items-center justify-center text-white text-[10px] font-medium`}
                  >
                    {getInitials(participant.nickname)}
                  </div>
                  <span className="text-xs">{toolIcons[participant.tool]}</span>
                  <span className="text-xs text-gray-600 max-w-[60px] truncate">
                    {participant.nickname}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
