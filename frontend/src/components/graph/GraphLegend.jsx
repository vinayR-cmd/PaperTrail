import React, { useState } from 'react'
import { Info, X } from 'lucide-react'

export default function GraphLegend() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          zIndex: 10
        }}
        title="How to read this graph"
        className="hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Info size={20} />
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        width: '320px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 10
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-display font-semibold text-[16px] text-[var(--text-primary)]">
          How to Read This Graph
        </h4>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3.5 text-[14px] font-ui text-[var(--text-secondary)] leading-relaxed">
        <p className="m-0">
          <strong className="text-[var(--text-primary)] block mb-0.5">Two Communities (Colors)</strong>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4f8ef7] mr-1.5"/>Blue and 
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7c3aed] mx-1.5"/>Purple nodes represent distinct research clusters pushed apart by a lack of cross-citations.
        </p>

        <p className="m-0">
          <strong className="text-[var(--text-primary)] block mb-0.5">Nodes (Circles)</strong>
          Each circle is a paper. Larger circles have higher citation counts.
        </p>

        <p className="m-0">
          <strong className="text-[var(--text-primary)] block mb-0.5">Edges (Lines)</strong>
          Connecting lines indicate one paper directly cited the other.
        </p>

        <p className="m-0">
          <strong className="text-[var(--text-primary)] block mb-0.5">Gap Zone (Middle Oval)</strong>
          The dotted area represents the "white space" or missing collaboration between the communities.
        </p>
      </div>

      <hr className="border-t border-[var(--border-subtle)] my-3.5" />

      <div className="text-[13px] font-mono text-[var(--text-tertiary)]">
        Hover nodes to highlight links. Click for details.
      </div>
    </div>
  )
}
