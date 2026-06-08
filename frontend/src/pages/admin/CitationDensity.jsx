import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { indexAPI } from '../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function CitationDensity() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const topicsRes = await supabase
        .from('topic_registry')
        .select('topic_slug, topic_label, paper_count')

      const edgeData = await Promise.all(
        (topicsRes.data || []).map(async (topic) => {
          const edgeRes = await supabase
            .from('citation_edges')
            .select('count')
            .eq('topic_slug', topic.topic_slug)
            .single()

          const edgeCount = edgeRes.data?.count || 0
          const paperCount = topic.paper_count || 1
          const density = parseFloat(
            (edgeCount / paperCount).toFixed(2)
          )

          return {
            topic: topic.topic_label ||
                   topic.topic_slug.replace(/-/g, ' '),
            slug: topic.topic_slug,
            papers: paperCount,
            edges: edgeCount,
            density,
            status: density === 0 ? 'No edges' :
                    density < 0.5 ? 'Sparse' :
                    density < 2 ? 'Moderate' : 'Dense'
          }
        })
      )

      setData(edgeData.sort((a, b) => b.density - a.density))
    } catch (e) {
      console.error('CitationDensity error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleRebuild = async (slug) => {
    setRebuilding(prev => ({ ...prev, [slug]: true }))
    try {
      // Delete existing edges to force build
      await supabase
        .from('citation_edges')
        .delete()
        .eq('topic_slug', slug)
      
      // Call build edges API
      await indexAPI.buildCitationEdges(slug)
      
      // Reload stats
      await loadData()
    } catch (e) {
      console.error('Rebuild edges failed:', e)
    } finally {
      setRebuilding(prev => ({ ...prev, [slug]: false }))
    }
  }

  const statusColor = (s) =>
    s === 'Dense' ? 'var(--success)' :
    s === 'Moderate' ? 'var(--accent)' :
    s === 'Sparse' ? 'var(--warning)' : 'var(--danger)'

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Loading citation density data...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Citation Network Density
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Edges per paper ratio per topic. Higher density =
          more interconnected field. Zero density = missing
          citation edges (needs rebuild).
        </p>
      </div>

      {/* Density status summary */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        gap:'16px', marginBottom:'24px'
      }}>
        {[
          { label:'Dense (2+)', color:'var(--success)',
            count: data.filter(d => d.density >= 2).length },
          { label:'Moderate (0.5-2)', color:'var(--accent)',
            count: data.filter(d =>
              d.density >= 0.5 && d.density < 2).length },
          { label:'Sparse (<0.5)', color:'var(--warning)',
            count: data.filter(d =>
              d.density > 0 && d.density < 0.5).length },
          { label:'No Edges', color:'var(--danger)',
            count: data.filter(d => d.density === 0).length },
        ].map((s, i) => (
          <div key={i} style={{
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'10px', padding:'18px',
            borderLeft: `4px solid ${s.color}`
          }}>
            <p style={{fontSize:'28px', fontWeight:700,
              color: s.color,
              fontFamily:'var(--font-display)',
              marginBottom:'4px'}}>{s.count}</p>
            <p style={{fontSize:'12px', color:'var(--text-secondary)',
              fontFamily:'var(--font-ui)'}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'12px', padding:'24px',
        marginBottom:'20px'
      }}>
        <h3 style={{fontSize:'14px', fontWeight:600,
          color:'var(--text-primary)', fontFamily:'var(--font-ui)',
          marginBottom:'20px'}}>
          Edges per Paper by Topic
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}
            margin={{left:0, right:0, top:0, bottom:40}}>
            <CartesianGrid strokeDasharray="3 3"
              stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="topic"
              tick={{fontSize:11, fill:'var(--text-secondary)',
                fontFamily:'Cabinet Grotesk'}}
              axisLine={false} tickLine={false}
              angle={-35} textAnchor="end"
              interval={0}/>
            <YAxis
              tick={{fontSize:11, fill:'var(--text-tertiary)'}}
              axisLine={false} tickLine={false}
              label={{value:'edges/paper', angle:-90,
                position:'insideLeft', offset:10,
                fontSize:11, fill:'var(--text-tertiary)'}}/>
            <Tooltip
              contentStyle={{
                background:'var(--bg-card)',
                border:'1px solid var(--border)',
                color:'var(--text-primary)',
                borderRadius:'8px', fontSize:'12px',
                fontFamily:'Cabinet Grotesk'
              }}
              formatter={(val) => [val, 'edges/paper']}
            />
            <Bar dataKey="density" radius={[4,4,0,0]}>
              {data.map((entry, i) => (
                <Cell key={i}
                  fill={statusColor(entry.status)}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'12px', overflow:'hidden'
      }}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg-surface)'}}>
              {['Topic','Papers','Citation Edges',
                'Density','Status','Action'].map((h,i) => (
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
            {data.map((row, i) => (
              <tr key={i}
                style={{borderBottom:'1px solid var(--border)',
                  transition:'background 0.1s'}}
                onMouseEnter={e =>
                  e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e =>
                  e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    fontSize:'14px', fontWeight:500,
                    color:'var(--text-primary)', fontFamily:'var(--font-ui)',
                    textTransform:'capitalize'
                  }}>{row.topic}</span>
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'14px', color:'var(--text-secondary)',
                  fontFamily:'var(--font-ui)'}}>
                  {row.papers.toLocaleString()}
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'14px', color:'var(--text-secondary)',
                  fontFamily:'var(--font-ui)'}}>
                  {row.edges.toLocaleString()}
                </td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    fontSize:'14px', fontWeight:700,
                    color: statusColor(row.status),
                    fontFamily:'var(--font-display)'
                  }}>
                    {row.density}
                  </span>
                </td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    fontSize:'11px', fontWeight:600,
                    padding:'3px 10px', borderRadius:'99px',
                    fontFamily:'var(--font-ui)',
                    background: row.status === 'Dense'
                      ? 'rgba(16, 185, 129, 0.15)' :
                      row.status === 'Moderate'
                      ? 'var(--accent-light)' :
                      row.status === 'Sparse'
                      ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: statusColor(row.status)
                  }}>{row.status}</span>
                </td>
                <td style={{padding:'12px 16px'}}>
                  <button
                    onClick={() => handleRebuild(row.slug)}
                    disabled={rebuilding[row.slug]}
                    className="btn-secondary"
                    style={{
                      padding:'4px 10px',
                      fontSize:'12px',
                      opacity: rebuilding[row.slug] ? 0.6 : 1,
                      cursor: rebuilding[row.slug] ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {rebuilding[row.slug] ? 'Rebuilding...' : 'Rebuild'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
