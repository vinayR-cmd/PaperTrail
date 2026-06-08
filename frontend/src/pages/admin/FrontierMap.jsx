import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import * as d3 from 'd3'
import { Compass } from 'lucide-react'

export default function FrontierMap() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [similarTopics, setSimilarTopics] = useState([])
  const svgRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Get all topics
      const topicsRes = await supabase
        .from('topic_registry')
        .select('*')
        .order('paper_count', { ascending: false })

      const topicsList = topicsRes.data || []

      // 2. Get all papers to calculate Jaccard vocab similarity between topics
      const papersRes = await supabase
        .from('paper_metadata')
        .select('title, topic_slug')

      const papers = papersRes.data || []

      // Tokenize and build vocabulary set per topic
      const stopWords = new Set(['and', 'of', 'in', 'the', 'for', 'to', 'a', 'with', 'on', 'an', 'by', 'using', 'based', 'from', 'as', 'its', 'their', 'new', 'multi', 'high', 'low'])
      const topicWords = {}
      
      topicsList.forEach(t => {
        topicWords[t.topic_slug] = new Set()
        // Include topic label words in vocabulary
        t.topic_label?.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
          if (w.length > 2 && !stopWords.has(w)) {
            topicWords[t.topic_slug].add(w)
          }
        })
      })

      papers.forEach(p => {
        if (!p.topic_slug || !topicWords[p.topic_slug]) return
        const titleWords = p.title?.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/) || []
        titleWords.forEach(w => {
          if (w.length > 3 && !stopWords.has(w)) {
            topicWords[p.topic_slug].add(w)
          }
        })
      })

      // Calculate links between topics using Jaccard Similarity index
      const links = []
      const similarities = {}

      for (let i = 0; i < topicsList.length; i++) {
        const slugA = topicsList[i].topic_slug
        similarities[slugA] = []

        for (let j = 0; j < topicsList.length; j++) {
          if (i === j) continue
          const slugB = topicsList[j].topic_slug

          const setA = topicWords[slugA] || new Set()
          const setB = topicWords[slugB] || new Set()
          
          if (setA.size === 0 || setB.size === 0) continue

          const intersect = new Set([...setA].filter(x => setB.has(x)))
          const unionSize = setA.size + setB.size - intersect.size
          const jaccard = intersect.size / (unionSize || 1)

          if (jaccard > 0.015) { // Similarity threshold
            similarities[slugA].push({
              topic: topicsList[j],
              score: parseFloat((jaccard * 100).toFixed(1))
            })
            if (i < j) {
              links.push({
                source: slugA,
                target: slugB,
                value: jaccard
              })
            }
          }
        }
        // Sort similarities descending
        similarities[slugA].sort((a, b) => b.score - a.score)
      }

      setTopics(topicsList.map(t => ({
        ...t,
        connections: similarities[t.topic_slug]?.length || 0,
        similar: similarities[t.topic_slug] || []
      })))

      // Draw force directed graph
      setTimeout(() => {
        drawGraph(topicsList, links, similarities)
      }, 50)

    } catch (e) {
      console.error('FrontierMap load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function drawGraph(nodesList, linksList, similarities) {
    if (!svgRef.current || nodesList.length === 0) return

    const width = svgRef.current.clientWidth || 800
    const height = 480

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform)
      })

    d3.select(svgRef.current).call(zoom)

    // Node size scale based on paper count
    const maxPapers = d3.max(nodesList, d => d.paper_count) || 1000
    const rScale = d3.scaleSqrt()
      .domain([0, maxPapers])
      .range([12, 35])

    // Color scale for topics
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

    // Force simulation
    const simulation = d3.forceSimulation(nodesList)
      .force('link', d3.forceLink(linksList).id(d => d.topic_slug).distance(120))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(d => rScale(d.paper_count) + 8))

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(linksList)
      .enter()
      .append('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1.5, d.value * 30))

    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodesList)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )

    // Append circles
    node.append('circle')
      .attr('r', d => rScale(d.paper_count))
      .attr('fill', d => colorScale(d.topic_slug))
      .attr('stroke', 'var(--bg-card)')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        // Highlight nodes
        node.selectAll('circle').attr('stroke', 'var(--bg-card)').attr('stroke-width', 2)
        d3.select(event.currentTarget).attr('stroke', 'var(--accent)').attr('stroke-width', 4)
        
        // Enrich selected topic with similarity data
        setSelectedTopic({
          ...d,
          connections: similarities[d.topic_slug]?.length || 0,
          similar: similarities[d.topic_slug] || []
        })
      })

    // Append text labels
    node.append('text')
      .text(d => d.topic_label || d.topic_slug)
      .attr('text-anchor', 'middle')
      .attr('dy', d => rScale(d.paper_count) + 14)
      .attr('font-size', '11px')
      .attr('font-family', 'var(--font-ui)')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text-primary)')

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node.attr('transform', d => `translate(${d.x}, ${d.y})`)
    })

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
  }

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Research Frontier Map
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Interactive topic landscape. Links denote vocabulary similarity (Jaccard Index)
          between papers inside topics. Click a node to view connections.
        </p>
      </div>

      <div style={{
        display:'grid', gridTemplateColumns:'2.5fr 1fr',
        gap:'20px', minHeight:'500px'
      }}>
        {/* Graph canvas */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', overflow:'hidden', position:'relative',
          height:'500px'
        }}>
          {loading ? (
            <div style={{
              height:'100%', display:'flex',
              alignItems:'center', justifyContent:'center',
              color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'
            }}>Analyzing research landscape...</div>
          ) : topics.length === 0 ? (
            <div style={{
              height:'100%', display:'flex',
              alignItems:'center', justifyContent:'center',
              color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'
            }}>No topics indexed yet</div>
          ) : (
            <svg ref={svgRef} style={{width:'100%', height:'100%'}}/>
          )}
        </div>

        {/* Info panel */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px', overflowY:'auto',
          height:'500px'
        }}>
          {selectedTopic ? (
            <div>
              <h3 style={{
                fontSize:'16px', fontWeight:700,
                color:'var(--text-primary)', fontFamily:'var(--font-display)',
                textTransform:'capitalize', marginBottom:'6px'
              }}>
                {selectedTopic.topic_label}
              </h3>
              <p style={{
                fontSize:'12px', color:'var(--text-tertiary)',
                fontFamily:'var(--font-mono)', marginBottom:'20px'
              }}>
                slug: {selectedTopic.topic_slug}
              </p>

              <div style={{
                display:'flex', gap:'12px', marginBottom:'24px'
              }}>
                <div style={{
                  flex:1, background:'var(--bg-surface)',
                  padding:'12px', borderRadius:'8px',
                  border:'1px solid var(--border)'
                }}>
                  <p style={{fontSize:'11px', color:'var(--text-tertiary)',
                    fontFamily:'var(--font-ui)', textTransform:'uppercase'}}>Papers</p>
                  <p style={{fontSize:'18px', fontWeight:700,
                    color:'var(--text-primary)'}}>{selectedTopic.paper_count?.toLocaleString()}</p>
                </div>
                <div style={{
                  flex:1, background:'var(--bg-surface)',
                  padding:'12px', borderRadius:'8px',
                  border:'1px solid var(--border)'
                }}>
                  <p style={{fontSize:'11px', color:'var(--text-tertiary)',
                    fontFamily:'var(--font-ui)', textTransform:'uppercase'}}>Links</p>
                  <p style={{fontSize:'18px', fontWeight:700,
                    color:'var(--accent)'}}>{selectedTopic.connections}</p>
                </div>
              </div>

              <h4 style={{
                fontSize:'13px', fontWeight:600,
                color:'var(--text-primary)', fontFamily:'var(--font-ui)',
                marginBottom:'12px', borderBottom:'1px solid var(--border)',
                paddingBottom:'6px'
              }}>Similar Research Frontiers</h4>

              {selectedTopic.similar?.length === 0 ? (
                <p style={{fontSize:'12px', color:'var(--text-tertiary)',
                  fontFamily:'var(--font-body)'}}>
                  No similar topics found (isolated field).
                </p>
              ) : (
                <div style={{
                  display:'flex', flexDirection:'column', gap:'10px'
                }}>
                  {selectedTopic.similar.slice(0, 5).map((sim, idx) => (
                    <div key={idx} style={{
                      display:'flex', justifyContent:'space-between',
                      alignItems:'center'
                    }}>
                      <span style={{
                        fontSize:'13px', color:'var(--text-secondary)',
                        fontFamily:'var(--font-ui)', textTransform:'capitalize'
                      }}>{sim.topic.topic_label}</span>
                      <span style={{
                        fontSize:'12px', fontWeight:700,
                        color:'var(--accent)', fontFamily:'var(--font-display)',
                        background:'var(--accent-light)', padding:'2px 8px',
                        borderRadius:'99px'
                      }}>{sim.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              height:'100%', display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              color:'var(--text-tertiary)', textAlign:'center'
            }}>
              <div style={{color: 'var(--text-tertiary)', marginBottom: '12px', display: 'flex', justifyContent: 'center'}}>
                <Compass size={28} />
              </div>
              <p style={{fontSize:'13px', fontFamily:'var(--font-ui)'}}>
                Click any node in the map to inspect its interdisciplinary connections.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
