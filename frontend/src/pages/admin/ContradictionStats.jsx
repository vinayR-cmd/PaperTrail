import { useState, useEffect } from 'react'
import { indexAPI } from '../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis
} from 'recharts'

export default function ContradictionStats() {
  const [data, setData] = useState(null)
  const [topicData, setTopicData] = useState([])
  const [scatterData, setScatterData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Get all contradictions from admin endpoint
      const contraRes = await indexAPI.getAdminContradictions()
      const contradictions = contraRes.data || []

      // Filter real ones (not sentinels)
      const real = contradictions.filter(c =>
        c.paper_a_id !== 'NONE' &&
        !c.paper_a_id?.startsWith('NONE_')
      )

      // Group by topic
      const byTopic = {}
      real.forEach(c => {
        if (!byTopic[c.topic_slug]) {
          byTopic[c.topic_slug] = {
            topic: c.topic_slug?.replace(/-/g, ' '),
            slug: c.topic_slug,
            count: 0,
            avgScore: 0,
            scores: []
          }
        }
        byTopic[c.topic_slug].count++
        if (c.contradiction_score) {
          byTopic[c.topic_slug].scores.push(
            c.contradiction_score
          )
        }
      })

      const topicArr = Object.values(byTopic).map(t => ({
        ...t,
        avgScore: t.scores.length > 0
          ? parseFloat((t.scores.reduce(
              (a, b) => a + b, 0
            ) / t.scores.length).toFixed(3))
          : 0
      })).sort((a, b) => b.count - a.count)

      setTopicData(topicArr)

      // Score distribution buckets
      const scoreBuckets = [
        { range: '0.35-0.45', count: 0 },
        { range: '0.45-0.55', count: 0 },
        { range: '0.55-0.65', count: 0 },
        { range: '0.65-0.75', count: 0 },
        { range: '0.75-0.85', count: 0 },
        { range: '0.85-1.0', count: 0 },
      ]
      real.forEach(c => {
        const s = c.contradiction_score || 0
        if (s >= 0.85) scoreBuckets[5].count++
        else if (s >= 0.75) scoreBuckets[4].count++
        else if (s >= 0.65) scoreBuckets[3].count++
        else if (s >= 0.55) scoreBuckets[2].count++
        else if (s >= 0.45) scoreBuckets[1].count++
        else if (s >= 0.35) scoreBuckets[0].count++
      })

      // Scatter: contradiction_score vs gap_score
      const gapCacheRes = await indexAPI.getAdminGapCache()

      const gapMap = {}
      gapCacheRes.data?.forEach(row => {
        const gaps = row.gaps_json || []
        gaps.forEach(g => {
          const key = `${row.topic_slug}_${g.cluster_a_id}_${g.cluster_b_id}`
          gapMap[key] = g.gap_score
        })
      })

      const scatter = real
        .filter(c => c.contradiction_score)
        .map(c => {
          const key = `${c.topic_slug}_${c.cluster_a_id}_${c.cluster_b_id}`
          return {
            x: Math.round(gapMap[key] || 0),
            y: parseFloat(
              (c.contradiction_score * 100).toFixed(1)
            ),
            topic: c.topic_slug
          }
        })
        .filter(d => d.x > 0)

      setScatterData(scatter)

      // Summary
      const sentinels = contradictions.filter(c =>
        c.paper_a_id === 'NONE' ||
        c.paper_a_id?.startsWith('NONE_')
      )
      setData({
        total: contradictions.length,
        real: real.length,
        checked: sentinels.length,
        avgScore: real.length > 0
          ? parseFloat((real.reduce(
              (sum, c) => sum + (c.contradiction_score || 0), 0
            ) / real.length).toFixed(3))
          : 0,
        scoreBuckets,
        highConf: real.filter(
          c => c.contradiction_score >= 0.65
        ).length
      })

    } catch (e) {
      console.error('ContradictionStats error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Loading contradiction data...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Contradiction Detection Stats
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          NLI model performance and contradiction patterns
          across all indexed topics.
        </p>
      </div>

      {/* Summary cards */}
      {data && (
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          gap:'16px', marginBottom:'24px'
        }}>
          {[
            { label:'Pairs Checked', value: data.checked,
              color:'var(--text-secondary)',
              desc:'Cluster pairs with no contradictions' },
            { label:'Contradictions Found', value: data.real,
              color:'var(--danger)',
              desc:'Real contradictions detected' },
            { label:'Avg Contradiction Score',
              value: data.avgScore,
              color:'var(--warning)',
              desc:'Higher = stronger conflict' },
            { label:'High Confidence (>0.65)',
              value: data.highConf,
              color:'var(--accent)',
              desc:'Strong contradictions' },
          ].map((s, i) => (
            <div key={i} style={{
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:'10px', padding:'18px'
            }}>
              <p style={{fontSize:'26px', fontWeight:700,
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
      )}

      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr',
        gap:'20px', marginBottom:'20px'
      }}>
        {/* Score distribution */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'20px'}}>
            Contradiction Score Distribution
          </h3>
          {data?.scoreBuckets && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.scoreBuckets}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="range"
                  tick={{fontSize:10, fill:'var(--text-tertiary)'}}
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10, fill:'var(--text-tertiary)'}}
                  axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{
                    background:'var(--bg-card)',
                    border:'1px solid var(--border)',
                    color:'var(--text-primary)',
                    borderRadius:'8px', fontSize:'12px'
                  }}
                  formatter={v => [v, 'Contradictions']}
                />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {data.scoreBuckets.map((_, i) => (
                    <Cell key={i}
                      fill={i >= 3 ? 'var(--danger)' :
                            i >= 1 ? 'var(--warning)' : 'var(--accent-light)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By topic */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'16px'}}>
            Contradictions by Topic
          </h3>
          {topicData.length === 0 ? (
            <p style={{color:'var(--text-tertiary)', fontSize:'13px',
              fontFamily:'var(--font-ui)', textAlign:'center',
              paddingTop:'40px'}}>
              No contradictions found yet
            </p>
          ) : (
            <div style={{
              display:'flex', flexDirection:'column', gap:'10px'
            }}>
              {topicData.slice(0, 8).map((t, i) => (
                <div key={i}>
                  <div style={{
                    display:'flex',
                    justifyContent:'space-between',
                    marginBottom:'4px'
                  }}>
                    <span style={{fontSize:'13px',
                      color:'var(--text-secondary)', fontFamily:'var(--font-ui)',
                      textTransform:'capitalize'}}>
                      {t.topic}
                    </span>
                    <div style={{
                      display:'flex', gap:'12px'
                    }}>
                      <span style={{fontSize:'12px',
                        color:'var(--danger)', fontWeight:600,
                        fontFamily:'var(--font-ui)'}}>
                        {t.count} found
                      </span>
                      <span style={{fontSize:'12px',
                        color:'var(--text-tertiary)',
                        fontFamily:'var(--font-ui)'}}>
                        avg {t.avgScore}
                      </span>
                    </div>
                  </div>
                  <div style={{height:'4px',
                    background:'var(--bg-surface)', borderRadius:'2px',
                    overflow:'hidden'}}>
                    <div style={{height:'100%',
                      width:`${(t.count / (topicData[0]?.count || 1)) * 100}%`,
                      background:'var(--danger)',
                      borderRadius:'2px'}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scatter: gap score vs contradiction score */}
      {scatterData.length > 0 && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'8px'}}>
            Gap Score vs Contradiction Strength
          </h3>
          <p style={{fontSize:'12px', color:'var(--text-tertiary)',
            fontFamily:'var(--font-ui)', marginBottom:'20px'}}>
            Each dot = one contradiction. X = gap score,
            Y = contradiction confidence. High-right = most
            valuable research opportunities.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3"
                stroke="var(--border)"/>
              <XAxis dataKey="x" name="Gap Score"
                tick={{fontSize:11, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}
                label={{value:'Gap Score', position:
                  'insideBottom', offset:-5,
                  fontSize:11, fill:'var(--text-tertiary)'}}/>
              <YAxis dataKey="y" name="Contradiction %"
                tick={{fontSize:11, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}
                label={{value:'Contradiction %', angle:-90,
                  position:'insideLeft', fontSize:11,
                  fill:'var(--text-tertiary)'}}/>
              <ZAxis range={[40, 40]}/>
              <Tooltip
                contentStyle={{
                  background:'var(--bg-card)',
                  border:'1px solid var(--border)',
                  color:'var(--text-primary)',
                  borderRadius:'8px', fontSize:'12px'
                }}
                formatter={(val, name) => [val,
                  name === 'x' ? 'Gap Score' :
                  'Contradiction %']}
              />
              <Scatter data={scatterData}
                fill="var(--danger)" fillOpacity={0.6}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
