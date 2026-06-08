import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { indexAPI } from '../../lib/api'
import * as d3 from 'd3'

export default function ResearchMap() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (topics.length > 0) drawChart()
  }, [topics])

  async function loadData() {
    setLoading(true)
    try {
      // Get all topics with paper counts
      const topicsRes = await supabase
        .from('topic_registry')
        .select('*')
        .order('paper_count', { ascending: false })

      // Get gap cache to get gap counts and scores
      const gapCacheRes = await indexAPI.getAdminGapCache()
      const gapCacheData = gapCacheRes.data || []

      // Get search history counts per topic
      const searchRes = await indexAPI.getAdminSearchHistory()
      const searchData = searchRes.data || []

      // Build enriched topic data
      const searchCounts = {}
      searchData.forEach(s => {
        searchCounts[s.topic_slug] = 
          (searchCounts[s.topic_slug] || 0) + 1
      })

      const gapData = {}
      gapCacheData.forEach(g => {
        const gaps = g.gaps_json || []
        const avgScore = gaps.length > 0
          ? gaps.reduce((sum, gap) => sum + (gap.gap_score || 0), 0) 
            / gaps.length
          : 0
        gapData[g.topic_slug] = {
          gapCount: gaps.length,
          avgScore: Math.round(avgScore)
        }
      })

      const enriched = (topicsRes.data || []).map(t => ({
        ...t,
        search_count: searchCounts[t.topic_slug] || 0,
        gap_count: gapData[t.topic_slug]?.gapCount || 0,
        avg_gap_score: gapData[t.topic_slug]?.avgScore || 0
      }))

      setTopics(enriched)
    } catch (e) {
      console.error('ResearchMap load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function drawChart() {
    if (!svgRef.current || topics.length === 0) return

    const width = svgRef.current.clientWidth || 800
    const height = 500

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Color scale based on avg_gap_score
    const colorScale = d3.scaleLinear()
      .domain([0, 40, 70, 100])
      .range(['#9ca3af', '#4361ee', '#059669', '#10b981'])

    // Size scale based on paper_count
    const maxPapers = d3.max(topics, d => d.paper_count) || 1000
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxPapers])
      .range([20, 80])

    // Force simulation
    const simulation = d3.forceSimulation(topics)
      .force('charge', d3.forceManyBody().strength(5))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(d => 
        sizeScale(d.paper_count) + 4))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))

    const nodes = svg.selectAll('g')
      .data(topics)
      .enter()
      .append('g')
      .style('cursor', 'pointer')

    // Bubble circles
    nodes.append('circle')
      .attr('r', d => sizeScale(d.paper_count))
      .attr('fill', d => colorScale(d.avg_gap_score))
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => colorScale(d.avg_gap_score))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 3)
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          data: d
        })
      })
      .on('mousemove', function(event) {
        setTooltip(prev => prev ? {
          ...prev, x: event.pageX, y: event.pageY
        } : null)
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('fill-opacity', 0.85)
          .attr('stroke-width', 2)
        setTooltip(null)
      })

    // Topic labels inside bubbles
    nodes.append('text')
      .text(d => {
        const r = sizeScale(d.paper_count)
        const label = d.topic_label || d.topic_slug
        return r > 35 ? label : 
               r > 25 ? label.split(' ')[0] : ''
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => {
        const r = sizeScale(d.paper_count)
        return r > 50 ? '12px' : '10px'
      })
      .attr('font-family', 'var(--font-ui), sans-serif')
      .attr('font-weight', '600')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')

    simulation.on('tick', () => {
      nodes.attr('transform', d =>
        `translate(${
          Math.max(80, Math.min(width - 80, d.x))
        }, ${
          Math.max(80, Math.min(height - 80, d.y))
        })`
      )
    })
  }

  return (
    <div>
      <div style={{marginBottom: '24px'}}>
        <h1 style={{
          fontSize: '22px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>Research Intelligence Map</h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Each bubble = one indexed research field.
          Size = papers indexed. Color = avg gap score
          (blue=moderate, green=high opportunity).
        </p>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '20px',
        marginBottom: '20px', flexWrap: 'wrap'
      }}>
        {[
          { color: '#9ca3af', label: 'Low opportunity (0-40)' },
          { color: '#4361ee', label: 'Moderate (40-70)' },
          { color: '#059669', label: 'High opportunity (70+)' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <div style={{
              width: '12px', height: '12px',
              borderRadius: '50%', background: item.color,
              flexShrink: 0
            }}/>
            <span style={{
              fontSize: '12px', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)'
            }}>{item.label}</span>
          </div>
        ))}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <div style={{
            display: 'flex', gap: '4px', alignItems: 'center'
          }}>
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%', background: '#4361ee'
            }}/>
            <div style={{
              width: '16px', height: '16px',
              borderRadius: '50%', background: '#4361ee'
            }}/>
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%', background: '#4361ee'
            }}/>
          </div>
          <span style={{
            fontSize: '12px', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)'
          }}>Size = papers indexed</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{
            height: '500px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)',
            fontSize: '14px'
          }}>Loading research map...</div>
        ) : topics.length === 0 ? (
          <div style={{
            height: '500px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)',
            fontSize: '14px'
          }}>No topics indexed yet</div>
        ) : (
          <svg ref={svgRef} style={{width:'100%', height:'500px'}}/>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 16,
          top: tooltip.y - 80,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: '180px'
        }}>
          <p style={{
            fontSize: '14px', fontWeight: 700,
            color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
            marginBottom: '8px',
            textTransform: 'capitalize'
          }}>
            {tooltip.data.topic_label || tooltip.data.topic_slug}
          </p>
          {[
            { label: 'Papers', value: tooltip.data.paper_count?.toLocaleString() },
            { label: 'Gaps Found', value: tooltip.data.gap_count },
            { label: 'Avg Gap Score', value: tooltip.data.avg_gap_score + '/100' },
            { label: 'Times Searched', value: tooltip.data.search_count },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '12px', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)'
              }}>{item.label}</span>
              <span style={{
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text-primary)', fontFamily: 'var(--font-ui)'
              }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Topic table below chart */}
      <div style={{
        marginTop: '24px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)'
        }}>
          <h3 style={{
            fontSize: '14px', fontWeight: 600,
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)'
          }}>All Indexed Topics</h3>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: 'var(--bg-surface)'}}>
              {['Topic', 'Papers', 'Gaps', 'Avg Score',
                'Searches', 'Indexed'].map((h, i) => (
                <th key={i} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  borderBottom: '1px solid var(--border)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map((t, i) => (
              <tr key={i} style={{
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e =>
                e.currentTarget.style.background = 'var(--bg-surface)'}
              onMouseLeave={e =>
                e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <td style={{padding: '12px 16px'}}>
                  <span style={{
                    fontSize: '14px', fontWeight: 500,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
                    textTransform: 'capitalize'
                  }}>
                    {t.topic_label || t.topic_slug}
                  </span>
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'14px', color:'var(--text-secondary)',
                  fontFamily:'var(--font-ui)'}}>
                  {t.paper_count?.toLocaleString()}
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'14px', color:'var(--text-secondary)',
                  fontFamily:'var(--font-ui)'}}>
                  {t.gap_count}
                </td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: t.avg_gap_score >= 70 ? 'var(--success)' :
                           t.avg_gap_score >= 40 ? 'var(--accent)' :
                           'var(--text-tertiary)',
                    fontFamily: 'var(--font-ui)'
                  }}>
                    {t.avg_gap_score > 0 ? t.avg_gap_score + '/100' : '—'}
                  </span>
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'14px', color:'var(--text-secondary)',
                  fontFamily:'var(--font-ui)'}}>
                  {t.search_count}
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'12px', color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)'}}>
                  {t.indexed_at
                    ? new Date(t.indexed_at).toLocaleDateString()
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
