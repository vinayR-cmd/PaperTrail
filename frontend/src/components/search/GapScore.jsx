import React, { useEffect, useState } from 'react'

export default function GapScore({ score, size = 80, animated = true }) {
  const radius = 30
  const strokeWidth = 6
  const center = size / 2
  const scale = size / 80 // Scale factors based on default size 80
  const circumference = 2 * Math.PI * radius
  
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const finalOffset = circumference - (score / 100) * circumference
    if (animated) {
      const timer = setTimeout(() => {
        setOffset(finalOffset)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setOffset(finalOffset)
    }
  }, [score, circumference, animated])

  // Get color based on score value
  const getStrokeColor = () => {
    if (score >= 70) return '#10d97e' // green
    if (score >= 40) return '#4f8ef7' // blue
    return '#7a8ba3' // muted grey
  }

  const strokeColor = getStrokeColor()

  return (
    <div className="flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius * scale}
          fill="none"
          stroke="rgba(0, 0, 0, 0.06)"
          strokeWidth={strokeWidth * scale}
        />

        {/* Progress Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius * scale}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth * scale}
          strokeDasharray={circumference * scale}
          strokeDashoffset={offset * scale}
          strokeLinecap="round"
          style={{
            transition: animated ? `stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
          }}
        />

        {/* Center Text (Rotated back) */}
        <g style={{ transform: `rotate(90deg) translate(0px, 0px)`, transformOrigin: `${center}px ${center}px` }}>
          {/* Score Value */}
          <text
            x={center}
            y={center + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-display font-bold"
            style={{
              fontSize: `${20 * scale}px`,
              fill: 'var(--text-primary)',
            }}
          >
            {Math.round(score)}
          </text>
          
          {/* Label */}
          <text
            x={center}
            y={center + 18 * scale}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: `${7 * scale}px`,
              fill: 'var(--text-tertiary)',
              letterSpacing: '0.1em',
              fontWeight: 600
            }}
          >
            SCORE
          </text>
        </g>
      </svg>
    </div>
  )
}
