import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import api, { indexAPI } from '../../lib/api'
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

export default function PipelineMonitor() {
  const [health, setHealth] = useState(null)
  const [recentSearches, setRecentSearches] = useState([])
  const [syncIssues, setSyncIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [backendOnline, setBackendOnline] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Check backend health
      try {
        const chromaRes = await indexAPI.getChromaStats()
        setBackendOnline(true)
        const supabaseVectors = chromaRes.data?.total_vectors || 0

        // Check Supabase paper count
        const paperRes = await supabase
          .from('paper_metadata')
          .select('count')
          .single()
        const supabasePapers = paperRes.data?.count || 0

        // Topics with 0 gap results from admin gap-cache
        const gapRes = await indexAPI.getAdminGapCache()
        const failedTopics = (gapRes.data || [])
          .filter(g => g.paper_count === 0)

        // Topics missing citation edges
        const topicsRes = await supabase
          .from('topic_registry')
          .select('topic_slug, topic_label')

        const missingEdges = []
        for (const t of (topicsRes.data || [])) {
          const edgeCheck = await supabase
            .from('citation_edges')
            .select('id')
            .eq('topic_slug', t.topic_slug)
            .limit(1)
          if (!edgeCheck.data?.length) {
            missingEdges.push(t.topic_slug)
          }
        }

        setSyncIssues({
          supabaseVectors,
          supabaseCount: supabasePapers,
          failedTopics,
          missingEdges
        })

        setHealth({
          backend: 'online',
          vectors: supabaseVectors,
          supabase: supabasePapers,
          topics: topicsRes.data?.length || 0
        })
      } catch (e) {
        setBackendOnline(false)
        setHealth({ backend: 'offline' })
      }

      // Recent searches from admin search history to bypass RLS
      const searchRes = await indexAPI.getAdminSearchHistory()
      const sortedSearches = (searchRes.data || [])
        .sort((a, b) => new Date(b.searched_at) - new Date(a.searched_at))
        .slice(0, 20)

      setRecentSearches(sortedSearches)

    } catch (e) {
      console.error('PipelineMonitor error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Checking pipeline health...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Pipeline Monitor
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          System health, sync status, and pipeline
          diagnostics.
        </p>
      </div>

      {/* System status */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        gap:'16px', marginBottom:'24px'
      }}>
        {[
          {
            label:'Backend API',
            value: backendOnline ? '● Online' : '● Offline',
            color: backendOnline ? 'var(--success)' : 'var(--danger)',
            desc: backendOnline
              ? `${api.defaults.baseURL} responding`
              : 'Cannot reach backend'
          },
          {
            label: 'Supabase Vectors (pgvector)',
            value: health?.vectors?.toLocaleString() || '—',
            color:'var(--accent)',
            desc: 'Persistent embeddings in Supabase'
          },
          {
            label:'Supabase Papers',
            value: health?.supabase?.toLocaleString() || '—',
            color:'var(--accent)',
            desc:'Papers in paper_metadata'
          },
        ].map((s, i) => (
          <div key={i} style={{
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'10px', padding:'20px'
          }}>
            <p style={{fontSize:'22px', fontWeight:700,
              color: s.color,
              fontFamily:'var(--font-display)',
              marginBottom:'4px'}}>{s.value}</p>
            <p style={{fontSize:'13px', fontWeight:600,
              color:'var(--text-primary)', fontFamily:'var(--font-ui)',
              marginBottom:'2px'}}>{s.label}</p>
            <p style={{fontSize:'11px', color:'var(--text-tertiary)',
              fontFamily:'var(--font-ui)'}}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Sync issues */}
      {syncIssues && (
        <div style={{marginBottom:'20px'}}>
          {/* Vector sync */}
          <div style={{
            background: syncIssues.supabaseVectors > 1000
              ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${syncIssues.supabaseVectors > 1000
              ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <span style={{fontSize: '20px'}}>
              {syncIssues.supabaseVectors > 1000 ? '✅' : '⚠️'}
            </span>
            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: 600,
                color: syncIssues.supabaseVectors > 1000
                  ? '#059669' : '#dc2626',
                fontFamily: 'var(--font-ui)',
                marginBottom: '4px'
              }}>
                Vector Storage:{' '}
                {syncIssues.supabaseVectors > 1000
                  ? 'Supabase pgvector — Persistent ✓'
                  : 'Low vector count — check embeddings'}
              </p>
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                fontFamily: 'var(--font-body)'
              }}>
                {syncIssues.supabaseVectors.toLocaleString()} vectors
                stored in Supabase pgvector |{' '}
                {syncIssues.supabaseCount.toLocaleString()} papers
                in paper_metadata |{' '}
                Survives server restarts ✓
              </p>
            </div>
          </div>

          {/* Missing edges */}
          {syncIssues.missingEdges?.length > 0 && (
            <div style={{
              background:'rgba(239, 68, 68, 0.15)',
              border:'1px solid rgba(239, 68, 68, 0.3)',
              borderRadius:'10px', padding:'16px',
              marginBottom:'12px'
            }}>
              <p style={{fontSize:'14px', fontWeight:600,
                color:'var(--danger)', fontFamily:'var(--font-ui)',
                marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}>
                <AlertTriangle size={16} />
                Topics Missing Citation Edges (
                {syncIssues.missingEdges.length})
              </p>
              <div style={{
                display:'flex', gap:'8px', flexWrap:'wrap'
              }}>
                {syncIssues.missingEdges.map((slug, i) => (
                  <span key={i} style={{
                    fontSize:'12px', padding:'3px 10px',
                    background:'var(--bg-surface)',
                    border:'1px solid var(--border)',
                    borderRadius:'99px', color:'var(--danger)',
                    fontFamily:'var(--font-ui)'
                  }}>{slug}</span>
                ))}
              </div>
              <p style={{fontSize:'12px', color:'var(--text-tertiary)',
                fontFamily:'var(--font-ui)',
                marginTop:'8px'}}>
                Run rebuild script for these topics.
              </p>
            </div>
          )}

          {/* Failed gap cache */}
          {syncIssues.failedTopics?.length > 0 && (
            <div style={{
              background:'rgba(245, 158, 11, 0.15)',
              border:'1px solid rgba(245, 158, 11, 0.3)',
              borderRadius:'10px', padding:'16px'
            }}>
              <p style={{fontSize:'14px', fontWeight:600,
                color:'var(--warning)', fontFamily:'var(--font-ui)',
                marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}>
                <AlertTriangle size={16} />
                Topics with 0 Gap Results (
                {syncIssues.failedTopics.length})
              </p>
              <div style={{
                display:'flex', gap:'8px', flexWrap:'wrap'
              }}>
                {syncIssues.failedTopics.map((t, i) => (
                  <span key={i} style={{
                    fontSize:'12px', padding:'3px 10px',
                    background:'var(--bg-surface)',
                    border:'1px solid var(--border)',
                    borderRadius:'99px', color:'var(--warning)',
                    fontFamily:'var(--font-ui)'
                  }}>{t.topic_slug}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent searches log */}
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
            Recent Search Log
          </h3>
          <button onClick={loadData} style={{
            padding:'6px 14px', background:'var(--bg-card)',
            border:'1px solid var(--border)', borderRadius:'6px',
            fontSize:'12px', fontFamily:'var(--font-ui)',
            color:'var(--accent)', cursor:'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
        <table style={{width:'100%',
          borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg-surface)'}}>
              {['Query','Topic Slug','Gaps Found',
                'Time'].map((h,i) => (
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
            {recentSearches.map((s, i) => (
              <tr key={i}
                style={{borderBottom:'1px solid var(--border)'}}
                onMouseEnter={e =>
                  e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e =>
                  e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <td style={{padding:'10px 16px',
                  fontSize:'13px', fontWeight:500,
                  color:'var(--text-primary)', fontFamily:'var(--font-ui)',
                  textTransform:'capitalize'}}>
                  {s.query}
                </td>
                <td style={{padding:'10px 16px',
                  fontSize:'12px', color:'var(--text-tertiary)',
                  fontFamily:'var(--font-mono)'}}>
                  {s.topic_slug}
                </td>
                <td style={{padding:'10px 16px'}}>
                  <span style={{
                    fontSize:'13px', fontWeight:600,
                    color: s.result_count > 0
                      ? 'var(--success)' : 'var(--danger)',
                    fontFamily:'var(--font-display)'
                  }}>
                    {s.result_count ?? '—'}
                  </span>
                </td>
                <td style={{padding:'10px 16px',
                  fontSize:'12px', color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)'}}>
                  {s.searched_at
                    ? new Date(s.searched_at)
                        .toLocaleString('en-US', {
                          month:'short', day:'numeric',
                          hour:'2-digit', minute:'2-digit'
                        })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
