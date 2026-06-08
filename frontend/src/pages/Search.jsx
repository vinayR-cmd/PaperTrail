import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../components/search/SearchBar'
import GapCard from '../components/search/GapCard'
import LoadingState from '../components/search/LoadingState'
import EmptyState from '../components/search/EmptyState'
import CitationGraph from '../components/graph/CitationGraph'
import { indexAPI, searchAPI } from '../lib/api'
import useScrollReveal from '../hooks/useScrollReveal'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

export default function Search() {
  const [query, setQuery] = useState('')
  const [currentTopic, setCurrentTopic] = useState('')
  const [currentTopicSlug, setCurrentTopicSlug] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [error, setError] = useState(null)
  const [selectedGap, setSelectedGap] = useState(null)
  const [sortBy, setSortBy] = useState('score')
  const [hasSearched, setHasSearched] = useState(false)
  const [freshness, setFreshness] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const timersRef = useRef([])
  const headerRef = useScrollReveal()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    const q = searchParams.get('q')
    try {
      const cached = sessionStorage.getItem('papertrail_search_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        const isValid = Date.now() - parsed.timestamp < 30 * 60 * 1000 &&
          parsed.results?.length > 0
        if (isValid && (!q || parsed.query === q)) {
          setQuery(parsed.query)
          setCurrentTopic(parsed.query)
          setCurrentTopicSlug(parsed.topicSlug)
          setResults(parsed.results)
          setHasSearched(true)
          return
        }
      }
    } catch (e) { /* ignore */ }
    if (q && q.trim()) {
      setQuery(q)
      handleSearch(q)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAndTriggerRefresh = async (topicSlug) => {
    try {
      const res = await indexAPI.checkFreshness(topicSlug)
      const data = res.data
      setFreshness(data)
      
      // Auto-trigger background refresh if data is stale
      // User is NOT blocked — this happens silently
      if (data.needs_refresh) {
        console.log('[PaperTrail] Data is stale — triggering background refresh')
        indexAPI.refreshTopic(topicSlug, false).catch(e => 
          console.warn('Background refresh trigger failed:', e.message)
        )
      }
    } catch (e) {
      console.warn('Freshness check failed (non-critical):', e.message)
    }
  }

  // ─── ONLY THIS FUNCTION CHANGED ───────────────────────────
  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setResults([])
    setSelectedGap(null)
    setFreshness(null)
    setRefreshing(false)
    setHasSearched(true)
    setCurrentTopic(searchQuery)
    sessionStorage.removeItem('papertrail_search_cache')

    const topicSlug = searchQuery.toLowerCase().trim().replace(/\s+/g, '-')
    setCurrentTopicSlug(topicSlug)

    try {
      // STEP 1 — Check if topic already indexed
      setLoadingStage(0)
      const statusRes = await indexAPI.getStatus(topicSlug)
      const alreadyIndexed = statusRes.data?.indexed === true

      if (!alreadyIndexed) {
        // NEW TOPIC: fetch papers from OpenAlex
        setLoadingStage(1)
        await indexAPI.indexTopic(searchQuery, 1000)
      }

      // STEP 2 — Ensure embeddings exist in ChromaDB
      setLoadingStage(2)
      try {
        await indexAPI.embedTopic(topicSlug)
      } catch (embedErr) {
        console.warn('Embed step warning (may already exist):', embedErr.message)
      }

      // STEP 3 — Build citation edges (CRITICAL — without this graph has 0 edges = 0 gaps)
      // For already-built topics this returns instantly ("already_built" status)
      // For new topics this fetches citation relationships from OpenAlex
      setLoadingStage(2)
      try {
        console.log('[PaperTrail] Building citation edges for:', topicSlug)
        const edgeRes = await indexAPI.buildCitationEdges(topicSlug)
        console.log('[PaperTrail] Citation edges:', edgeRes.data?.status, edgeRes.data?.edges_stored || 'cached')
      } catch (edgeErr) {
        console.error('[PaperTrail] Citation edge build failed:', edgeErr.message)
        // Continue anyway — gap detection will run but may find 0 gaps
        // if edges truly don't exist
      }

      // STEP 4 — Run full gap detection pipeline
      setLoadingStage(3)
      const gapRes = await searchAPI.findGaps(topicSlug, 15)
      setLoadingStage(4)

      const gaps = gapRes.data?.gaps || []
      setResults(gaps)

      // Check freshness and trigger background refresh if needed
      // This is non-blocking — user already has results
      checkAndTriggerRefresh(topicSlug)

      // Cache for back-button restoration (30 min TTL)
      sessionStorage.setItem('papertrail_search_cache', JSON.stringify({
        query: searchQuery,
        topicSlug,
        results: gaps,
        timestamp: Date.now()
      }))

      // Save to search history (non-critical)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('search_history').insert({
            user_id: user.id,
            query: searchQuery,
            topic_slug: topicSlug,
            result_count: gaps.length
          })
        }
      } catch (e) { /* non-critical — don't block on this */ }

    } catch (err) {
      console.error('[PaperTrail] Search error:', err)
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Search failed. Make sure the backend is running on port 8000.'
      )
    } finally {
      setLoading(false)
    }
  }
  // ─── END CHANGED SECTION ──────────────────────────────────

  const sortedResults = useMemo(() => {
    if (sortBy === 'score') {
      return [...results].sort((a, b) => b.gap_score - a.gap_score)
    }
    if (sortBy === 'urgent') {
      return [...results].sort((a, b) => {
        const order = { URGENT: 0, ACTIVE: 1, STABLE: 2, DECLINING: 3, INSUFFICIENT_DATA: 4 }
        const scoreA = order[a.combined_urgency] !== undefined ? order[a.combined_urgency] : 99
        const scoreB = order[b.combined_urgency] !== undefined ? order[b.combined_urgency] : 99
        return scoreA - scoreB
      })
    }
    if (sortBy === 'contradictions') {
      return [...results].sort((a, b) => (b.contradiction_count || 0) - (a.contradiction_count || 0))
    }
    return results
  }, [results, sortBy])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      paddingTop: '60px',
      color: 'var(--text-primary)'
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '40px 40px',
        transition: 'max-width 0.3s ease'
      }}>

        {/* Header Section */}
        <div ref={headerRef} className="reveal" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '13px' , fontWeight: 600,
            color: 'var(--accent)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            justifyContent: 'center'
          }}>
            <span style={{
              display: 'inline-block', width: '8px', height: '8px',
              borderRadius: '50%', background: 'var(--accent)'
            }} className="animate-pulse" />
            Research Gap Intelligence
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.15, display: 'block',
            marginBottom: '16px'
          }}>
            Find the gaps that <br />
            <span style={{ color: 'var(--accent)' }}>matter.</span>
          </h1>

          <p style={{
            fontSize: '17px' ,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            maxWidth: '520px', lineHeight: 1.6,
            margin: '12px auto 32px', textAlign: 'center'
          }}>
            Enter a research domain to map its citation network, detect structural gaps, and surface untapped opportunities.
          </p>
        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <SearchBar onSearch={handleSearch} isLoading={loading} />
        </div>

        {/* Results / Empty / Loading State Machine */}
        <div style={{ marginTop: '40px' }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingState topic={currentTopic} stage={loadingStage} />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderLeft: '4px solid var(--danger)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '16px' }}>
                  <AlertCircle style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} size={24} />
                  <div>
                    <h3 style={{ fontSize: '18px' , fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Analysis Pipeline Failed
                    </h3>
                    <p style={{ fontSize: '16px' , color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                      {typeof error === 'string' ? error : error.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSearch(currentTopic)}
                  className="btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '14px'  }}
                >
                  <RefreshCw size={12} />
                  Retry Analysis
                </button>
              </motion.div>
            ) : results.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                {/* Results Header Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  {/* Left: result count + freshness */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '16px' , fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                      {results.length} research gaps found in <span style={{ fontStyle: 'italic' }}>"{currentTopic}"</span>
                    </span>

                    {/* Freshness label */}
                    {freshness && freshness.found && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '14px',
                          color: freshness.needs_refresh ? 'var(--warning)' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-ui)'
                        }}>
                          {freshness.needs_refresh ? (
                            <AlertCircle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                          ) : (
                            <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          )}
                          <span>
                            {freshness.freshness_label}
                            {freshness.paper_count && 
                              ` · ${freshness.paper_count.toLocaleString()} papers`}
                          </span>
                        </div>

                        {/* Manual refresh button */}
                        <button
                          onClick={async () => {
                            if (refreshing) return
                            setRefreshing(true)
                            try {
                              await indexAPI.refreshTopic(currentTopicSlug, true)
                              // Show message — actual results update on next search
                              setFreshness(prev => ({
                                ...prev,
                                freshness_label: 'Refresh started — search again in 5 minutes for updated results',
                                needs_refresh: false
                              }))
                            } catch (e) {
                              console.warn('Manual refresh failed:', e.message)
                            } finally {
                              setRefreshing(false)
                            }
                          }}
                          disabled={refreshing}
                          style={{
                            padding: '3px 10px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '99px',
                            fontSize: '13px',
                            fontFamily: 'var(--font-ui)',
                            color: refreshing ? 'var(--text-tertiary)' : 'var(--accent)',
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => {
                            if (!refreshing) {
                              e.currentTarget.style.borderColor = 'var(--accent)'
                              e.currentTarget.style.background = 'var(--accent-light)'
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.background = 'var(--bg-card)'
                          }}
                        >
                          {refreshing ? (
                            <>
                              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              Refresh
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: sort selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' , fontFamily: 'var(--font-ui)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Sort by
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '15px' ,
                        fontFamily: 'var(--font-ui)',
                        color: 'var(--text-secondary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="score">Highest Score</option>
                      <option value="urgent">Most Urgent</option>
                      <option value="contradictions">Most Contradictions</option>
                    </select>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div style={{
                  display: selectedGap ? 'grid' : 'block',
                  gridTemplateColumns: selectedGap ? '1fr 650px' : '1fr',
                  gap: '24px',
                  alignItems: 'start'
                }}>
                  {/* Left Column: Gap Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {sortedResults.map((gap, i) => (
                      <GapCard
                        key={gap.gap_id}
                        gap={gap}
                        index={i}
                        selected={selectedGap?.gap_id === gap.gap_id}
                        onViewGraph={(g) => setSelectedGap(g)}
                      />
                    ))}
                  </div>

                  {/* Right Column: Sticky Citation Graph */}
                  {selectedGap && (
                    <div style={{
                      position: 'sticky',
                      top: '80px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-md)',
                      height: '750px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <CitationGraph
                        gap={selectedGap}
                        topicSlug={currentTopicSlug}
                        onClose={() => setSelectedGap(null)}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ) : hasSearched ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState type="no-results" />
              </motion.div>
            ) : (
              <motion.div
                key="initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState type="initial" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}