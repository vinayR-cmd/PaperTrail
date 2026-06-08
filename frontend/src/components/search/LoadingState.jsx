import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const stages = [
  "Resolving research concept...",
  "Fetching papers from OpenAlex...",
  "Building citation graph...",
  "Detecting research communities...",
  "Generating intelligence report..."
]

// Constellation dot coordinates inside 300x300 SVG
const dots = [
  { x: 150, y: 50 },  // Top
  { x: 245, y: 119 }, // Top-Right
  { x: 209, y: 231 }, // Bottom-Right
  { x: 91, y: 231 },  // Bottom-Left
  { x: 55, y: 119 }   // Top-Left
]

// Define connections between dots to form a beautiful star/network
const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0], // Outer ring
  [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]  // Inner star
]

export default function LoadingState({ topic, stage = 0 }) {
  const currentStageText = stages[Math.min(stage, 4)]
  const progressPercent = ((stage + 1) / stages.length) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] w-full text-center py-12 px-4 select-none">
      {/* Above small info */}
      <span className="text-[var(--text-tertiary)] font-mono text-xs uppercase tracking-widest mb-6">
        Analyzing: <span className="text-[var(--text-secondary)] font-sans font-medium italic">"{topic}"</span>
      </span>

      {/* Constellation Container */}
      <div className="relative w-[300px] h-[300px] mb-8">
        <svg width="300" height="300" className="absolute inset-0">
          {/* Animated Connecting Lines */}
          {connections.map(([fromIdx, toIdx], i) => {
            const from = dots[fromIdx]
            const to = dots[toIdx]
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--accent-blue)"
                strokeWidth="1"
                className="constellation-line"
                style={{
                  animationDelay: `${i * 0.4}s`,
                  opacity: 0.15
                }}
              />
            )
          })}
        </svg>

        {/* Outer orbital rings (decorative) */}
        <div className="absolute inset-[30px] rounded-full border border-dashed border-black/[0.04] animate-[spin_60s_linear_infinite]" />
        <div className="absolute inset-[80px] rounded-full border border-dashed border-black/[0.06] animate-[spin_40s_linear_infinite_reverse]" />

        {/* Interactive Dots */}
        {dots.map((dot, idx) => {
          const isActive = idx === stage
          const isVisited = idx < stage
          
          return (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700"
              style={{
                left: dot.x,
                top: dot.y,
                width: isActive ? '14px' : '8px',
                height: isActive ? '14px' : '8px',
                background: isActive 
                  ? 'var(--accent-cyan)' 
                  : isVisited 
                    ? 'var(--accent-blue)' 
                    : 'var(--text-tertiary)',
                boxShadow: isActive 
                  ? '0 0 12px rgba(67, 97, 238, 0.5)' 
                  : isVisited 
                    ? '0 0 6px rgba(67, 97, 238, 0.2)' 
                    : 'none',
                opacity: isActive ? 1 : isVisited ? 0.8 : 0.4
              }}
            />
          )
        })}
      </div>

      {/* Stage Message with AnimatePresence */}
      <div className="h-8 mb-6 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="font-ui text-sm text-[var(--text-secondary)] tracking-wide font-medium"
          >
            {currentStageText}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Loading Progress Bar Container */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-[280px] h-[2px] bg-gray-100 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-cyan)] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
          {Math.round(progressPercent)}% COMPLETE
        </span>
      </div>

      {/* CSS Styles for animations */}
      <style>{`
        .constellation-line {
          animation: pulseLine 4s infinite ease-in-out;
        }
        @keyframes pulseLine {
          0%, 100% {
            opacity: 0.05;
            stroke: rgba(79, 142, 247, 0.2);
          }
          50% {
            opacity: 0.6;
            stroke: rgba(34, 211, 238, 0.8);
            stroke-width: 1.5px;
          }
        }
      `}</style>
    </div>
  )
}
