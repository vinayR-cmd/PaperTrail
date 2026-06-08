import React, { useState, useEffect, useRef } from 'react'
import { Search, X, ArrowRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const presetTopics = [
  "Machine Learning",
  "Drug Discovery",
  "Climate Science",
  "Quantum Computing",
  "Neuroscience",
  "Materials Science",
  "Computer Vision",
  "Genomics"
]

export default function SearchBar({ onSearch, isLoading }) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  // Listen for Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if (query.trim() && !isLoading) {
      onSearch(query.trim())
    }
  }

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    } else if (e.key === 'Escape') {
      handleClear()
    }
  }

  const handleChipClick = (topic) => {
    setQuery(topic)
    if (!isLoading) {
      onSearch(topic)
    }
  }

  return (
    <div className="w-full max-w-[720px] mx-auto">
      {/* Search Input Container */}
      <div className="relative">
        <div
          style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--bg-card)',
            border: isFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '8px 8px 8px 16px',
            gap: '8px',
            boxShadow: isFocused ? '0 0 0 3px var(--accent-light)' : 'var(--shadow-sm)',
            transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.2s',
            height: '56px',
            position: 'relative',
            overflow: 'hidden'
          }}
          className={isLoading ? 'opacity-80' : ''}
        >
          {/* Left Search Icon */}
          <Search
            size={18}
            style={{
              color: isFocused ? 'var(--accent)' : 'var(--text-tertiary)',
              transition: 'color 0.15s ease',
              marginRight: '8px',
              flexShrink: 0
            }}
          />

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Search a research topic... e.g. 'machine learning in drug discovery'"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '17px' , fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
              background: 'transparent'
            }}
          />

          {/* Right Area: Shortcuts and Buttons */}
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <AnimatePresence mode="wait">
              {query.length === 0 ? (
                // Cmd+K Shortcut Badge
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    fontSize: '12px' ,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}
                >
                  ⌘K
                </motion.div>
              ) : (
                // Action Buttons
                <div className="flex items-center gap-2">
                  {/* Clear Button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={handleClear}
                    disabled={isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex'
                    }}
                    className="hover:text-[var(--text-primary)]"
                  >
                    <X size={18} />
                  </motion.button>

                  {/* Submit Button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={handleSubmit}
                    disabled={isLoading}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: isLoading ? 'var(--text-tertiary)' : 'var(--accent)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                      transition: 'background 0.15s'
                    }}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </motion.button>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Loading Progress Bar */}
          {isLoading && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--bg-surface)', overflow: 'hidden' }}>
              <div 
                style={{
                  height: '100%',
                  width: '30%',
                  background: 'var(--accent)',
                  animation: 'scan 1.5s infinite linear'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Select Preset Topic Chips */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
        {presetTopics.map((topic, i) => (
          <button
            key={i}
            onClick={() => handleChipClick(topic)}
            disabled={isLoading}
            style={{
              padding: '6px 14px',
              borderRadius: '99px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              fontSize: '15px' ,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-light)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-card)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Scan Animation style definition */}
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
