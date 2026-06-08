import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { indexAPI } from '../../lib/api'
import { RefreshCw, Check } from 'lucide-react'

export default function DataFreshness() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await supabase
        .from('topic_registry')
        .select('*')
        .order('last_refreshed_at',
          { ascending: true, nullsFirst: true })

      const now = new Date()
      const enriched = (res.data || []).map(t => {
        const refreshDate = new Date(
          t.last_refreshed_at || t.indexed_at
        )
        const daysOld = Math.floor(
          (now - refreshDate) / (1000 * 60 * 60 * 24)
        )
        const status =
          daysOld === 0 ? 'fresh' :
          daysOld < 7 ? 'recent' :
          daysOld < 30 ? 'aging' : 'stale'
        return { ...t, daysOld, status, refreshDate }
      })

      setTopics(enriched)
    } catch (e) {
      console.error('DataFreshness error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleForceRefresh(slug) {
    setRefreshing(prev => ({ ...prev, [slug]: true }))
    try {
      await indexAPI.refreshTopic(slug, true)
      // Update local state
      setTopics(prev => prev.map(t =>
        t.topic_slug === slug
          ? { ...t, status: 'refreshing',
              daysOld: 0 }
          : t
      ))
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setRefreshing(prev => ({ ...prev, [slug]: false }))
    }
  }

  const statusConfig = {
    fresh:      { color:'var(--success)', bg:'rgba(16, 185, 129, 0.15)',
                  border:'rgba(16, 185, 129, 0.3)', label:'Fresh' },
    recent:     { color:'var(--accent)', bg:'var(--accent-light)',
                  border:'var(--border-strong)', label:'Recent' },
    aging:      { color:'var(--warning)', bg:'rgba(245, 158, 11, 0.15)',
                  border:'rgba(245, 158, 11, 0.3)', label:'Aging' },
    stale:      { color:'var(--danger)', bg:'rgba(239, 68, 68, 0.15)',
                  border:'rgba(239, 68, 68, 0.3)', label:'Stale' },
    refreshing: { color:'var(--text-secondary)', bg:'var(--bg-surface)',
                  border:'var(--border)', label:'Refreshing...' }
  }

  const summary = {
    fresh:  topics.filter(t => t.status === 'fresh').length,
    recent: topics.filter(t => t.status === 'recent').length,
    aging:  topics.filter(t => t.status === 'aging').length,
    stale:  topics.filter(t => t.status === 'stale').length,
  }

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Loading freshness data...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Data Freshness Dashboard
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Monitor how current each topic's paper data is.
          Topics older than 30 days auto-refresh on next search.
          Force refresh any topic immediately below.
        </p>
      </div>

      {/* Summary traffic lights */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        gap:'16px', marginBottom:'24px'
      }}>
        {Object.entries(summary).map(([status, count]) => {
          const cfg = statusConfig[status]
          return (
            <div key={status} style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius:'10px', padding:'18px',
              borderLeft: `4px solid ${cfg.color}`
            }}>
              <p style={{fontSize:'28px', fontWeight:700,
                color: cfg.color,
                fontFamily:'var(--font-display)',
                marginBottom:'4px'}}>{count}</p>
              <p style={{fontSize:'13px', fontWeight:600,
                color: cfg.color,
                fontFamily:'var(--font-ui)',
                marginBottom:'2px'}}>
                {cfg.label} Topics
              </p>
              <p style={{fontSize:'11px', color: cfg.color,
                opacity:0.7, fontFamily:'var(--font-ui)'}}>
                {status === 'fresh' ? 'Updated today' :
                 status === 'recent' ? 'Updated this week' :
                 status === 'aging' ? '7-30 days old' :
                 'Over 30 days old'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Topic freshness table */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'12px', overflow:'hidden'
      }}>
        <div style={{
          padding:'16px 20px',
          borderBottom:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between',
          alignItems:'center'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)'}}>
            All Topics — Freshness Status
          </h3>
          <button onClick={loadData}
            style={{
              padding:'6px 14px', background:'var(--bg-card)',
              border:'1px solid var(--border)', borderRadius:'6px',
              fontSize:'12px', fontFamily:'var(--font-ui)',
              color:'var(--accent)', cursor:'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
            <RefreshCw size={12} />
            Refresh View
          </button>
        </div>
        <table style={{width:'100%',
          borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg-surface)'}}>
              {['Topic','Papers','Last Refreshed',
                'Age','Status','Action'].map((h,i) => (
                <th key={i} style={{
                  padding:'10px 16px', textAlign:'left',
                  fontSize:'11px', fontWeight:700,
                  color:'var(--text-tertiary)', fontFamily:'var(--font-ui)',
                  textTransform:'uppercase',
                  letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map((t, i) => {
              const cfg = statusConfig[t.status]
              const isRefreshing = refreshing[t.topic_slug]
              return (
                <tr key={i}
                  style={{borderBottom:'1px solid var(--border)',
                    transition:'background 0.1s'}}
                  onMouseEnter={e =>
                    e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseLeave={e =>
                    e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontSize:'14px',
                      fontWeight:500, color:'var(--text-primary)',
                      fontFamily:'var(--font-ui)',
                      textTransform:'capitalize'}}>
                      {t.topic_label ||
                       t.topic_slug.replace(/-/g,' ')}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px',
                    fontSize:'14px', color:'var(--text-secondary)',
                    fontFamily:'var(--font-ui)'}}>
                    {t.paper_count?.toLocaleString() || '—'}
                  </td>
                  <td style={{padding:'12px 16px',
                    fontSize:'13px', color:'var(--text-secondary)',
                    fontFamily:'var(--font-ui)'}}>
                    {t.refreshDate?.toLocaleDateString('en-US', {
                      month:'short', day:'numeric',
                      year:'numeric'
                    })}
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontSize:'14px',
                      fontWeight:600, color: cfg.color,
                      fontFamily:'var(--font-display)'}}>
                      {t.daysOld === 0 ? 'Today' :
                       `${t.daysOld}d ago`}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{
                      fontSize:'11px', fontWeight:600,
                      padding:'3px 10px', borderRadius:'99px',
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                      fontFamily:'var(--font-ui)'
                    }}>{cfg.label}</span>
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <button
                      onClick={() =>
                        handleForceRefresh(t.topic_slug)}
                      disabled={isRefreshing ||
                        t.status === 'fresh'}
                      style={{
                        padding:'6px 12px',
                        background: t.status === 'fresh'
                          ? 'var(--bg-surface)' : 'var(--bg-card)',
                        border:'1px solid var(--border)',
                        borderRadius:'6px',
                        fontSize:'12px',
                        fontFamily:'var(--font-ui)',
                        color: t.status === 'fresh'
                          ? 'var(--text-tertiary)' : 'var(--accent)',
                        cursor: t.status === 'fresh'
                          ? 'not-allowed' : 'pointer',
                        transition:'all 0.15s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isRefreshing ? (
                        <>
                          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          Starting...
                        </>
                      ) : t.status === 'fresh' ? (
                        <>
                          <Check size={12} />
                          Fresh
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          Force Refresh
                        </>
                      )}
                    </button>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
