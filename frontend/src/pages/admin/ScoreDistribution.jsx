import { useState, useEffect } from 'react'
import { indexAPI } from '../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'

export default function ScoreDistribution() {
  const [histData, setHistData] = useState([])
  const [urgencyData, setUrgencyData] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await indexAPI.getAdminGapCache()

      const allGaps = []
      const gapCacheList = res.data || []
      gapCacheList.forEach(row => {
        const gaps = row.gaps_json || []
        gaps.forEach(g => {
          if (g.gap_score) allGaps.push(g)
        })
      })

      if (allGaps.length === 0) {
        setLoading(false)
        return
      }

      // Build histogram buckets 0-10, 10-20, ..., 90-100
      const buckets = Array.from({length: 10}, (_, i) => ({
        range: `${i*10}-${i*10+10}`,
        count: 0,
        min: i * 10,
        max: i * 10 + 10
      }))

      allGaps.forEach(g => {
        const score = g.gap_score || 0
        const bucket = Math.min(Math.floor(score / 10), 9)
        buckets[bucket].count++
      })

      setHistData(buckets)

      // Urgency distribution
      const urgencyCounts = {}
      allGaps.forEach(g => {
        const u = g.combined_urgency || 'UNKNOWN'
        urgencyCounts[u] = (urgencyCounts[u] || 0) + 1
      })

      // We'll use CSS variable references so colors fit the theme
      const urgencyColors = {
        'URGENT': 'var(--danger)',
        'ACTIVE': 'var(--accent)',
        'STABLE': 'var(--text-secondary)',
        'DECLINING': 'var(--text-tertiary)',
        'INSUFFICIENT_DATA': 'var(--border-strong)',
        'UNKNOWN': 'var(--bg-surface)'
      }

      setUrgencyData(
        Object.entries(urgencyCounts).map(([name, value]) => ({
          name, value,
          color: urgencyColors[name] || 'var(--text-tertiary)'
        }))
      )

      // Summary stats
      const scores = allGaps.map(g => g.gap_score || 0)
      setStats({
        total: allGaps.length,
        avg: Math.round(scores.reduce((a,b) => a+b, 0) / scores.length),
        max: Math.round(Math.max(...scores)),
        min: Math.round(Math.min(...scores)),
        high: scores.filter(s => s >= 70).length,
        medium: scores.filter(s => s >= 40 && s < 70).length,
        low: scores.filter(s => s < 40).length
      })

    } catch (e) {
      console.error('ScoreDistribution error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Loading score distribution...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Gap Score Distribution
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Distribution of gap scores across all detected
          research gaps in the system.
        </p>
      </div>

      {/* Summary stats */}
      {stats && (
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          gap:'16px', marginBottom:'24px'
        }}>
          {[
            { label:'Total Gaps', value: stats.total, color:'var(--accent)' },
            { label:'Average Score', value: stats.avg + '/100', color:'var(--success)' },
            { label:'High Opportunity (70+)',
              value: stats.high, color:'var(--success)' },
            { label:'Low Opportunity (<40)',
              value: stats.low, color:'var(--text-tertiary)' },
          ].map((s, i) => (
            <div key={i} style={{
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:'10px', padding:'18px'
            }}>
              <p style={{fontSize:'24px', fontWeight:700,
                color: s.color, fontFamily:'var(--font-display)',
                marginBottom:'4px'}}>{s.value}</p>
              <p style={{fontSize:'12px', color:'var(--text-secondary)',
                fontFamily:'var(--font-ui)'}}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display:'grid', gridTemplateColumns:'2fr 1fr',
        gap:'20px'
      }}>
        {/* Histogram */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'20px'}}>Score Histogram</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histData}>
              <CartesianGrid strokeDasharray="3 3"
                stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="range"
                tick={{fontSize:11, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{
                  background:'var(--bg-card)',
                  border:'1px solid var(--border)',
                  color:'var(--text-primary)',
                  borderRadius:'8px', fontSize:'12px'
                }}
                formatter={(val) => [val, 'Gaps']}
              />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {histData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.min >= 70 ? 'var(--success)' :
                          entry.min >= 40 ? 'var(--accent)' :
                          'var(--accent-light)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Urgency pie */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'20px'}}>Urgency Breakdown</h3>
          {urgencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={urgencyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="45%"
                  outerRadius={90}
                  label={({name, percent}) =>
                    `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {urgencyData.map((entry, i) => (
                    <Cell key={i} fill={entry.color}/>
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background:'var(--bg-card)',
                    border:'1px solid var(--border)',
                    color:'var(--text-primary)',
                    fontSize:'12px',
                    borderRadius:'8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{color:'var(--text-tertiary)', fontSize:'13px',
              fontFamily:'var(--font-ui)', textAlign:'center',
              paddingTop:'40px'}}>
              No gap data available
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
