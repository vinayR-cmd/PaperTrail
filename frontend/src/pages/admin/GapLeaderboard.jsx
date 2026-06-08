import { useState, useEffect } from 'react'
import { indexAPI } from '../../lib/api'
import { Star } from 'lucide-react'

export default function GapLeaderboard() {
  const [savedGaps, setSavedGaps] = useState([])
  const [topGaps, setTopGaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('saved')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Most saved gaps
      const savedRes = await indexAPI.getAdminSavedGaps()
      const savedGapsList = savedRes.data || []

      // Count saves per gap title
      const saveCounts = {}
      savedGapsList.forEach(g => {
        const key = g.gap_title
        if (!saveCounts[key]) {
          saveCounts[key] = {
            title: g.gap_title,
            topic: g.topic_slug,
            score: g.gap_score,
            saves: 0,
            latest: g.saved_at
          }
        }
        saveCounts[key].saves++
      })

      setSavedGaps(
        Object.values(saveCounts)
          .sort((a, b) => b.saves - a.saves)
          .slice(0, 20)
      )

      // Top scoring gaps from gap_cache
      const cacheRes = await indexAPI.getAdminGapCache()

      const allGaps = []
      const gapCacheList = cacheRes.data || []
      gapCacheList.forEach(row => {
        const gaps = row.gaps_json || []
        gaps.forEach(g => {
          allGaps.push({
            title: g.gap_label,
            topic: row.topic_slug,
            score: g.gap_score,
            urgency: g.combined_urgency,
            contradictions: g.contradiction_count || 0
          })
        })
      })

      setTopGaps(
        allGaps
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
      )

    } catch (e) {
      console.error('GapLeaderboard error:', e)
    } finally {
      setLoading(false)
    }
  }

  const urgencyStyle = (u) => {
    let background = 'var(--bg-surface)'
    let color = 'var(--text-secondary)'

    if (u === 'URGENT') {
      background = 'rgba(239, 68, 68, 0.15)'
      color = 'var(--danger)'
    } else if (u === 'ACTIVE') {
      background = 'var(--accent-light)'
      color = 'var(--accent)'
    }

    return {
      fontSize: '11px', fontWeight: 600,
      padding: '2px 8px', borderRadius: '99px',
      fontFamily: 'var(--font-ui)',
      background,
      color
    }
  }

  const displayData = view === 'saved' ? savedGaps : topGaps

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Gap Leaderboard
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Most bookmarked and highest-scoring research gaps
          across all users and topics.
        </p>
      </div>

      {/* View toggle */}
      <div style={{
        display:'flex', gap:'4px',
        background:'var(--bg-surface)', borderRadius:'8px',
        padding:'3px', width:'fit-content',
        marginBottom:'20px'
      }}>
        {[
          { id:'saved', label:'Most Saved by Users' },
          { id:'score', label:'Highest Scored' }
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              padding:'8px 18px', borderRadius:'6px',
              border:'none', cursor:'pointer',
              fontSize:'13px', fontFamily:'var(--font-ui)',
              fontWeight: view === tab.id ? 600 : 400,
              background: view === tab.id ? 'var(--bg-card)' : 'transparent',
              color: view === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: view === tab.id
                ? 'var(--shadow-sm)' : 'none',
              transition:'all 0.15s'
            }}
          >{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'60px',
          color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
          Loading leaderboard...
        </div>
      ) : (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', overflow:'hidden'
        }}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg-surface)'}}>
                <th style={{
                  padding:'12px 16px', textAlign:'left',
                  fontSize:'11px', fontWeight:700, color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)',
                  textTransform:'uppercase', letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)', width:'40px'
                }}>#</th>
                <th style={{
                  padding:'12px 16px', textAlign:'left',
                  fontSize:'11px', fontWeight:700, color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)',
                  textTransform:'uppercase', letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)'
                }}>Research Gap</th>
                <th style={{
                  padding:'12px 16px', textAlign:'left',
                  fontSize:'11px', fontWeight:700, color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)',
                  textTransform:'uppercase', letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)'
                }}>Topic</th>
                <th style={{
                  padding:'12px 16px', textAlign:'center',
                  fontSize:'11px', fontWeight:700, color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)',
                  textTransform:'uppercase', letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)'
                }}>Score</th>
                <th style={{
                  padding:'12px 16px', textAlign:'center',
                  fontSize:'11px', fontWeight:700, color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)',
                  textTransform:'uppercase', letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)'
                }}>
                  {view === 'saved' ? 'Saves' : 'Urgency'}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding:'40px', textAlign:'center',
                    color:'var(--text-tertiary)', fontFamily:'var(--font-ui)',
                    fontSize:'14px'
                  }}>
                    {view === 'saved'
                      ? 'No gaps saved by users yet'
                      : 'No gap data in cache yet'}
                  </td>
                </tr>
              ) : displayData.map((gap, i) => (
                <tr key={i}
                  style={{borderBottom:'1px solid var(--border)',
                    transition:'background 0.1s'}}
                  onMouseEnter={e =>
                    e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseLeave={e =>
                    e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <td style={{
                    padding:'14px 16px',
                    fontSize:'14px', fontWeight:700,
                    color: i === 0 ? 'var(--warning)' :
                           i === 1 ? 'var(--text-tertiary)' :
                           i === 2 ? '#b45309' : 'var(--text-tertiary)',
                    fontFamily:'var(--font-display)',
                    textAlign:'center'
                  }}>
                    {i < 3 ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: i === 0 ? 'rgba(245, 158, 11, 0.15)' :
                                    i === 1 ? 'rgba(148, 163, 184, 0.15)' :
                                    'rgba(180, 83, 9, 0.15)',
                        color: i === 0 ? 'var(--warning)' :
                               i === 1 ? 'var(--text-secondary)' :
                               '#b45309',
                        border: `1px solid ${
                          i === 0 ? 'rgba(245, 158, 11, 0.3)' :
                          i === 1 ? 'rgba(148, 163, 184, 0.3)' :
                          'rgba(180, 83, 9, 0.3)'
                        }`,
                        fontSize: '12px',
                        fontWeight: 800
                      }}>
                        {i + 1}
                      </span>
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td style={{padding:'14px 16px'}}>
                    <p style={{
                      fontSize:'13px', fontWeight:500,
                      color:'var(--text-primary)', fontFamily:'var(--font-ui)',
                      lineHeight:1.4,
                      display:'-webkit-box',
                      WebkitLineClamp:2,
                      WebkitBoxOrient:'vertical',
                      overflow:'hidden'
                    }}>
                      {gap.title || '—'}
                    </p>
                  </td>
                  <td style={{padding:'14px 16px'}}>
                    <span style={{
                      fontSize:'12px', color:'var(--text-secondary)',
                      fontFamily:'var(--font-ui)',
                      textTransform:'capitalize'
                    }}>
                      {gap.topic?.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td style={{padding:'14px 16px',
                    textAlign:'center'}}>
                    <span style={{
                      fontSize:'14px', fontWeight:700,
                      color: gap.score >= 70 ? 'var(--success)' :
                             gap.score >= 40 ? 'var(--accent)' :
                             'var(--text-tertiary)',
                      fontFamily:'var(--font-display)'
                    }}>
                      {gap.score ? Math.round(gap.score) : '—'}
                    </span>
                  </td>
                  <td style={{padding:'14px 16px',
                    textAlign:'center'}}>
                    {view === 'saved' ? (
                        <span style={{
                          fontSize:'14px', fontWeight:700,
                          color:'var(--accent)',
                          fontFamily:'var(--font-display)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}>
                          {gap.saves}
                          <Star size={13} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
                        </span>
                    ) : (
                      <span style={urgencyStyle(gap.urgency)}>
                        {gap.urgency || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
