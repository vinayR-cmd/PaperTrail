import React from 'react'
import { motion } from 'framer-motion'

export default function EmptyState({ type = "initial" }) {
  const isInitial = type === "initial"

  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] text-center p-8 max-w-md mx-auto select-none">
      {/* Icon Container with subtle floating animation */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6 text-[var(--text-tertiary)] flex items-center justify-center"
      >
        {isInitial ? (
          // Constellation / Citation Graph SVG
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Connecting lines */}
            <path d="M25 40 L60 20" strokeDasharray="3 3" opacity="0.4" />
            <path d="M60 20 L95 40" />
            <path d="M25 40 L40 85" />
            <path d="M40 85 L80 95" strokeDasharray="3 3" opacity="0.4" />
            <path d="M80 95 L95 40" />
            <path d="M60 20 L60 60" />
            <path d="M60 60 L40 85" />
            <path d="M60 60 L80 95" />
            <path d="M25 40 L60 60" />
            <path d="M95 40 L60 60" />

            {/* Nodes */}
            <circle cx="60" cy="20" r="5" fill="var(--bg-void)" stroke="var(--accent-blue)" strokeWidth="2" />
            <circle cx="25" cy="40" r="4" fill="var(--bg-void)" stroke="var(--text-secondary)" strokeWidth="2" />
            <circle cx="95" cy="40" r="4" fill="var(--bg-void)" stroke="var(--text-secondary)" strokeWidth="2" />
            <circle cx="60" cy="60" r="6" fill="var(--bg-void)" stroke="var(--accent-violet)" strokeWidth="2" />
            <circle cx="40" cy="85" r="4" fill="var(--bg-void)" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            <circle cx="80" cy="95" r="5" fill="var(--bg-void)" stroke="var(--accent-cyan)" strokeWidth="2" />
          </svg>
        ) : (
          // Magnifying Glass with X SVG
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Magnifying Glass Ring */}
            <circle cx="55" cy="55" r="28" stroke="var(--text-secondary)" strokeWidth="2" />
            {/* Handle */}
            <line x1="75" y1="75" x2="100" y2="100" stroke="var(--text-tertiary)" strokeWidth="3" />
            
            {/* The 'X' inside */}
            <line x1="47" y1="47" x2="63" y2="63" stroke="var(--danger)" strokeWidth="2.5" />
            <line x1="63" y1="47" x2="47" y2="63" stroke="var(--danger)" strokeWidth="2.5" />
            
            {/* Muted outer rays (decorative) */}
            <line x1="55" y1="15" x2="55" y2="20" opacity="0.3" />
            <line x1="95" y1="55" x2="90" y2="55" opacity="0.3" />
            <line x1="15" y1="55" x2="20" y2="55" opacity="0.3" />
          </svg>
        )}
      </motion.div>

      {/* Heading */}
      <h3 className="text-2xl font-display font-bold text-[var(--text-secondary)] mb-3">
        {isInitial ? "Map the unknown" : "No significant gaps found"}
      </h3>

      {/* Description Text */}
      <p className="text-sm text-[var(--text-tertiary)] font-body leading-relaxed max-w-[340px]">
        {isInitial
          ? "Search any research field to discover structural gaps, unresolved contradictions, and untapped opportunities."
          : "Try a more specific topic or broaden your search. This topic may be well-explored or not yet indexed."}
      </p>
    </div>
  )
}
