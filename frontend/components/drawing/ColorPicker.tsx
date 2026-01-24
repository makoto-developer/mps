'use client'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

const COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#FF6B6B', // Light Red
  '#00FF00', // Green
  '#4ECDC4', // Teal
  '#0000FF', // Blue
  '#45B7D1', // Light Blue
  '#FFFF00', // Yellow
  '#FFE66D', // Light Yellow
  '#FF00FF', // Magenta
  '#DDA0DD', // Plum
  '#00FFFF', // Cyan
  '#98D8C8', // Mint
  '#FF8C00', // Orange
  '#FFA07A', // Light Salmon
]

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`
            w-8 h-8 rounded-lg border-2 transition-transform
            ${value === color ? 'border-gray-800 scale-110 shadow-lg' : 'border-gray-300 hover:scale-105'}
          `}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border-2 border-gray-300"
          title="Custom color"
        />
      </div>
    </div>
  )
}
