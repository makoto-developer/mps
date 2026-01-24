'use client'

interface BrushSizeSelectorProps {
  value: number
  onChange: (size: number) => void
}

const BRUSH_SIZES = [1, 3, 5, 10, 15, 20]

export function BrushSizeSelector({ value, onChange }: BrushSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {BRUSH_SIZES.map((size) => (
        <button
          key={size}
          onClick={() => onChange(size)}
          className={`
            flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all
            ${value === size 
              ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold' 
              : 'border-gray-300 hover:border-gray-400 bg-white'
            }
          `}
          title={`${size}px`}
        >
          <span
            className="rounded-full bg-current"
            style={{
              width: Math.min(size * 1.5, 24),
              height: Math.min(size * 1.5, 24),
            }}
          />
        </button>
      ))}
    </div>
  )
}
