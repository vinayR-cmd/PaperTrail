import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, Home, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import GraphLegend from './GraphLegend'

export default function CitationGraph({ gap, topicSlug, onClose }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const hideTooltipTimer = useRef(null)

  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [graphError, setGraphError] = useState(null)

  const [selectedNode, setSelectedNode] = useState(null)
  const [paperDetails, setPaperDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [allEdges, setAllEdges] = useState(null)
  const [maxNodesPerCommunity, setMaxNodesPerCommunity] = useState(15)

  // Fetch all topic edges once
  useEffect(() => {
    let active = true
    async function fetchEdges() {
      const { data, error } = await supabase
        .from('citation_edges')
        .select('citing_paper_id, cited_paper_id')
        .eq('topic_slug', topicSlug)
      if (active && data) {
        setAllEdges(data)
      }
    }
    fetchEdges()
    return () => { active = false }
  }, [topicSlug])

  // Construct graph when data, edges or maxNodes change
  useEffect(() => {
    if (!allEdges) return
    let active = true

    async function constructGraphData() {
      setLoading(true)
      try {
        const topA = (gap.top_papers_a || []).slice(0, maxNodesPerCommunity)
        const topB = (gap.top_papers_b || []).slice(0, maxNodesPerCommunity)
        const combinedPapers = [...topA, ...topB]

        // Create nodes map
        const nodeMap = new Map()
        combinedPapers.forEach(p => {
          if (!p.openalex_id) return
          nodeMap.set(p.openalex_id, {
            id: p.openalex_id,
            title: p.title,
            year: p.year,
            citations: p.citation_count || 0,
            cluster: gap.top_papers_a?.some(pa => pa.openalex_id === p.openalex_id) 
              ? gap.cluster_a_id 
              : gap.cluster_b_id
          })
        })

        const nodeArray = Array.from(nodeMap.values())

        // Filter edges to only keep citation links between nodes in our view
        const linkArray = []
        allEdges.forEach(edge => {
          if (nodeMap.has(edge.citing_paper_id) && nodeMap.has(edge.cited_paper_id)) {
            linkArray.push({
              source: edge.citing_paper_id,
              target: edge.cited_paper_id
            })
          }
        })

        if (active) {
          setNodes(nodeArray)
          setLinks(linkArray)
        }
      } catch (err) {
        console.error('Error constructing graph data:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    constructGraphData()

    return () => {
      active = false
    }
  }, [gap, allEdges, maxNodesPerCommunity])

  // Fetch paper details when a node is selected
  useEffect(() => {
    if (!selectedNode) {
      setPaperDetails(null)
      return
    }

    let active = true
    async function fetchPaperDetails() {
      setLoadingDetails(true)
      try {
        const { data, error } = await supabase
          .from('paper_metadata')
          .select('*')
          .eq('openalex_id', selectedNode.id)
          .single()

        if (error) throw error
        if (active && data) {
          setPaperDetails(data)
        }
      } catch (err) {
        console.error('Error fetching paper details:', err)
      } finally {
        if (active) setLoadingDetails(false)
      }
    }

    fetchPaperDetails()
    return () => {
      active = false
    }
  }, [selectedNode])

  // D3 force simulation setup
  useEffect(() => {
    if (!svgRef.current) return
    if (!gap) return
    if (loading || nodes.length === 0) return

    try {
      const width = containerRef.current.clientWidth || 800
      const height = containerRef.current.clientHeight || 750

      const svg = d3.select(svgRef.current)
        .attr('width', '100%')
        .attr('height', '100%')

      // Clear previous elements
      svg.selectAll('*').remove()

      // Create a container group for zoom and pan
      const container = svg.append('g').attr('class', 'graph-content')

      // Define radial glow filters
      const defs = svg.append('defs')
      
      // Gradient definitions for clusters
      const gradBlue = defs.append('radialGradient')
        .attr('id', 'blue-glow')
      gradBlue.append('stop').attr('offset', '0%').attr('stop-color', '#4f8ef7').attr('stop-opacity', 0.12)
      gradBlue.append('stop').attr('offset', '100%').attr('stop-color', '#4f8ef7').attr('stop-opacity', 0)

      const gradViolet = defs.append('radialGradient')
        .attr('id', 'violet-glow')
      gradViolet.append('stop').attr('offset', '0%').attr('stop-color', '#7c3aed').attr('stop-opacity', 0.12)
      gradViolet.append('stop').attr('offset', '100%').attr('stop-color', '#7c3aed').attr('stop-opacity', 0)

      // Drop shadows for nodes
      const filterA = defs.append('filter').attr('id', 'shadow-blue')
      filterA.append('feDropShadow')
        .attr('dx', 0).attr('dy', 0).attr('stdDeviation', 4)
        .attr('flood-color', '#4f8ef7').attr('flood-opacity', 0.3)

      const filterB = defs.append('filter').attr('id', 'shadow-violet')
      filterB.append('feDropShadow')
        .attr('dx', 0).attr('dy', 0).attr('stdDeviation', 4)
        .attr('flood-color', '#7c3aed').attr('flood-opacity', 0.3)

      // Zoom and pan setup
      const zoomBehavior = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
          container.attr('transform', event.transform)
        })

      svg.call(zoomBehavior)

      // Zoom controls handlers
      d3.select('#btn-zoom-in').on('click', () => {
        svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3)
      })
      d3.select('#btn-zoom-out').on('click', () => {
        svg.transition().duration(300).call(zoomBehavior.scaleBy, 1/1.3)
      })
      d3.select('#btn-zoom-reset').on('click', () => {
        svg.transition().duration(400).call(
          zoomBehavior.transform,
          d3.zoomIdentity.translate(0, 0).scale(1)
        )
      })

      // Centroids glow backgrounds
      const centroidAGlow = container.append('circle')
        .attr('r', 120)
        .attr('fill', 'url(#blue-glow)')
        .attr('pointer-events', 'none')

      const centroidBGlow = container.append('circle')
        .attr('r', 120)
        .attr('fill', 'url(#violet-glow)')
        .attr('pointer-events', 'none')

      // Centroid labels
      const labelA = container.append('text')
        .text('Community A')
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-tertiary)')
        .attr('font-size', '12px')
        .attr('font-family', 'var(--font-ui)')
        .attr('letter-spacing', '0.1em')
        .attr('text-transform', 'uppercase')
        .attr('pointer-events', 'none')

      const labelB = container.append('text')
        .text('Community B')
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-tertiary)')
        .attr('font-size', '12px')
        .attr('font-family', 'var(--font-ui)')
        .attr('letter-spacing', '0.1em')
        .attr('text-transform', 'uppercase')
        .attr('pointer-events', 'none')

      // Gap zone group
      const gapZoneGroup = container.append('g').attr('class', 'gap-zone-group')
      const isDarkMode = document.documentElement.classList.contains('dark')
      
      const gapZoneOval = gapZoneGroup.append('ellipse')
        .attr('fill', isDarkMode ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.04)')
        .attr('stroke', isDarkMode ? 'rgba(245, 158, 11, 0.45)' : 'rgba(245, 158, 11, 0.25)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4, 4')
        .attr('pointer-events', 'none')

      const gapZoneLabel = gapZoneGroup.append('text')
        .text('Research Gap Zone')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isDarkMode ? 'rgba(245, 158, 11, 0.85)' : 'rgba(245, 158, 11, 0.7)')
        .attr('font-size', '12px')
        .attr('font-family', 'var(--font-ui)')
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.05em')
        .attr('pointer-events', 'none')

      // Links (Citation edges)
      const link = container.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', 'var(--border)')
        .attr('stroke-width', 1)
        .attr('pointer-events', 'none')

      // Node radius calculation
      const nodeRadius = (d) => Math.max(8, Math.min(30, 6 + Math.sqrt(d.citations / 100)))

      // Nodes (Circles)
      const node = container.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => nodeRadius(d))
        .attr('fill', d => d.cluster === gap.cluster_a_id ? '#4f8ef7' : '#7c3aed')
        .attr('stroke', d => d.cluster === gap.cluster_a_id ? 'rgba(79, 142, 247, 0.4)' : 'rgba(124, 58, 237, 0.4)')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .attr('filter', d => d.cluster === gap.cluster_a_id ? 'url(#shadow-blue)' : 'url(#shadow-violet)')

      // Tooltip overlay
      const tooltip = d3.select(svgRef.current.parentNode)
        .append('div')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'var(--bg-card)')
        .style('border', '1px solid var(--border)')
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('pointer-events', 'none')
        .style('max-width', '240px')
        .style('min-width', '160px')
        .style('z-index', '1000')
        .style('box-shadow', 'var(--shadow-md)')

      // Node interactions
      node
        .on('mouseover', (event, d) => {
          // Highlight hovered node by scaling its radius r rather than transform scale
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', nodeRadius(d) * 1.35)

          // Highlight connected links, fade others
          const connectedNodeIds = new Set([d.id])
          const connectedLinkIds = new Set()

          links.forEach(l => {
            if (l.source.id === d.id) {
              connectedNodeIds.add(l.target.id)
              connectedLinkIds.add(`${l.source.id}-${l.target.id}`)
            }
            if (l.target.id === d.id) {
              connectedNodeIds.add(l.source.id)
              connectedLinkIds.add(`${l.source.id}-${l.target.id}`)
            }
          })

          // Fade out non-connected nodes
          node.style('opacity', n => connectedNodeIds.has(n.id) ? 1.0 : 0.3)
          // Highlight connected links
          link
            .style('opacity', l => {
              const linkId = `${l.source.id}-${l.target.id}`
              return connectedLinkIds.has(linkId) ? 1.0 : 0.15
            })
            .attr('stroke', l => {
              const linkId = `${l.source.id}-${l.target.id}`
              return connectedLinkIds.has(linkId) ? 'var(--accent)' : 'var(--border)'
            })
            .attr('stroke-width', l => {
              const linkId = `${l.source.id}-${l.target.id}`
              return connectedLinkIds.has(linkId) ? 2.0 : 1
            })

          // Position relative to node center coordinates (transformed by D3 zoom)
          const transform = d3.zoomTransform(svgRef.current)
          const nodeX = d.x * transform.k + transform.x
          const nodeY = d.y * transform.k + transform.y

          // Calculate offset to place tooltip to the right of the expanded node circle
          const r = nodeRadius(d) * 1.35 * transform.k
          const tooltipX = nodeX + r + 12
          const tooltipY = nodeY - 30

          // Cancel any pending hide
          if (hideTooltipTimer.current) {
            clearTimeout(hideTooltipTimer.current)
            hideTooltipTimer.current = null
          }

          tooltip
            .style('visibility', 'visible')
            .style('top', `${tooltipY}px`)
            .style('left', `${tooltipX}px`)
            .html(`
              <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); font-family: var(--font-ui); line-height: 1.4; margin-bottom: 6px; display: block; pointer-events: none;" class="line-clamp-2">${d.title}</div>
              <div style="font-size: 14px; color: var(--text-secondary); font-family: var(--font-ui); display: block; pointer-events: none;">${d.year} · ${d.citations.toLocaleString()} citations</div>
            `)
        })
        .on('mouseout', (event, d) => {
          // Reset radius r
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', nodeRadius(d))

          // Restore node opacity and link styles
          node.style('opacity', 1)
          link
            .style('opacity', 1)
            .attr('stroke', 'var(--border)')
            .attr('stroke-width', 1)

          // Hide tooltip after 150ms delay to prevent flicker
          hideTooltipTimer.current = setTimeout(() => {
            tooltip.style('visibility', 'hidden')
          }, 150)
        })
        .on('click', (event, d) => {
          setSelectedNode(d)
        })

      // Drag nodes Behavior
      node.call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
      )

      // Force simulation setup
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(110))
        .force('charge', d3.forceManyBody().strength(-240))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => nodeRadius(d) + 12))
        .force('x', d3.forceX(width / 2).strength(0.06))
        .force('y', d3.forceY(height / 2).strength(0.06))

      // Simulation tick function
      simulation.on('tick', () => {
        // Calculate centroids of communities dynamically
        const centroidA = { x: 0, y: 0, count: 0 }
        const centroidB = { x: 0, y: 0, count: 0 }

        nodes.forEach(n => {
          if (n.cluster === gap.cluster_a_id) {
            centroidA.x += n.x
            centroidA.y += n.y
            centroidA.count++
          } else {
            centroidB.x += n.x
            centroidB.y += n.y
            centroidB.count++
          }
        })

        if (centroidA.count > 0) { centroidA.x /= centroidA.count; centroidA.y /= centroidA.count }
        if (centroidB.count > 0) { centroidB.x /= centroidB.count; centroidB.y /= centroidB.count }

        // Update centroids radial glows
        centroidAGlow.attr('cx', centroidA.x).attr('cy', centroidA.y)
        centroidBGlow.attr('cx', centroidB.x).attr('cy', centroidB.y)

        // Update centroids labels
        labelA.attr('x', centroidA.x).attr('y', centroidA.y - 12)
        labelB.attr('x', centroidB.x).attr('y', centroidB.y - 12)

        // Update Gap Zone Oval and Text
        if (centroidA.count > 0 && centroidB.count > 0) {
          const midX = (centroidA.x + centroidB.x) / 2
          const midY = (centroidA.y + centroidB.y) / 2
          const dx = centroidB.x - centroidA.x
          const dy = centroidB.y - centroidA.y
          const dist = Math.sqrt(dx*dx + dy*dy)
          const angle = Math.atan2(dy, dx) * 180 / Math.PI

          gapZoneOval
            .attr('cx', midX)
            .attr('cy', midY)
            .attr('rx', Math.max(60, dist / 2.2))
            .attr('ry', 40)
            .attr('transform', `rotate(${angle}, ${midX}, ${midY})`)

          gapZoneLabel
            .attr('x', midX)
            .attr('y', midY)
            .attr('transform', `rotate(${angle}, ${midX}, ${midY})`)
        }

        // Update links
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        // Update nodes
        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
      })

      return () => {
        simulation.stop()
        tooltip.remove()
        if (hideTooltipTimer.current) {
          clearTimeout(hideTooltipTimer.current)
        }
      }
    } catch (err) {
      console.error('D3 graph error:', err)
      setGraphError(err.message)
    }
  }, [gap, loading, nodes, links])

  if (graphError) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        background: 'var(--bg-page)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
      }}>
        <div style={{color: 'var(--warning)', display: 'flex', justifyContent: 'center'}}>
          <AlertTriangle size={36} />
        </div>
        <p style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          fontSize: '16px' ,
          textAlign: 'center',
          maxWidth: '300px'
        }}>
          Graph visualization failed to load.<br/>
          <span style={{color:'var(--text-tertiary)', fontSize: '14px'}}>
            {graphError}
          </span>
        </p>
        <button
          onClick={() => setGraphError(null)}
          className="btn-ghost"
          style={{fontSize: '15px', padding:'8px 16px'}}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border)'
      }}
    >
      {/* Header Bar */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div className="flex items-center select-none">
          <span style={{
            fontSize: '17px' ,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)'
          }}>
            Citation Network Graph
          </span>
          <span style={{
            fontSize: '15px' ,
            color: 'var(--text-secondary)',
            marginLeft: '8px'
          }} className="font-mono bg-[var(--bg-surface)] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-primary)]">
            {nodes.length} nodes · {links.length} edges
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Node Density Slider */}
          <div className="flex items-center gap-2 mr-4 bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <label className="text-[12px] text-[var(--text-secondary)] font-ui font-medium">Density:</label>
            <input 
              type="range" 
              min="3" 
              max="50" 
              value={maxNodesPerCommunity}
              onChange={(e) => setMaxNodesPerCommunity(parseInt(e.target.value))}
              className="w-24 accent-[var(--accent-blue)] cursor-pointer"
              title={`${maxNodesPerCommunity * 2} nodes max`}
            />
          </div>

          <button id="btn-zoom-in" title="Zoom In" style={{ width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px' , display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="bg-[var(--bg-surface)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer">
            <ZoomIn size={16} />
          </button>
          <button id="btn-zoom-out" title="Zoom Out" style={{ width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px' , display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="bg-[var(--bg-surface)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer">
            <ZoomOut size={16} />
          </button>
          <button id="btn-zoom-reset" title="Recenter View" style={{ width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px' , display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="bg-[var(--bg-surface)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer">
            <Home size={16} />
          </button>
          <hr className="h-4 border-none border-l border-[var(--border)] mx-1" />
          <button onClick={onClose} title="Close Graph" style={{ width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px' , display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="bg-[var(--bg-surface)] hover:bg-[var(--danger)]/10 text-[var(--text-secondary)] hover:text-[var(--danger)] border border-[var(--border)] transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main SVG Plot Canvas */}
      <div className="relative flex-grow">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[var(--accent-blue)]" size={32} />
            <span className="text-xs text-[var(--text-secondary)] font-ui tracking-wide">
              Loading citation network...
            </span>
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%', flex: 1 }} className="block bg-transparent" />
        )}

        {/* Legend Overlay */}
        {!loading && <GraphLegend />}

        {/* Slide-in Side Panel for Paper details */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: '280px',
                height: '100%',
                background: 'var(--bg-card)',
                borderLeft: '1px solid var(--border)',
                zIndex: 20,
                padding: '20px'
              }}
              className="flex flex-col justify-between shadow-lg"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="overflow-y-auto pr-1 flex-grow">
                {loadingDetails ? (
                  <div className="h-48 flex items-center justify-center">
                     <Loader2 className="animate-spin text-[var(--accent-blue)]" size={24} />
                  </div>
                ) : paperDetails ? (
                  <div className="mt-4 flex flex-col gap-4 text-left select-text">
                    {/* Community tag */}
                    <div>
                      <span
                        className="text-[9px] font-ui font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: paperDetails.cluster_id === gap.cluster_a_id ? 'rgba(79, 142, 247, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                          color: paperDetails.cluster_id === gap.cluster_a_id ? '#4f8ef7' : '#7c3aed',
                        }}
                      >
                        {paperDetails.cluster_id === gap.cluster_a_id ? 'COMMUNITY A' : 'COMMUNITY B'}
                      </span>
                    </div>

                    {/* Paper Title */}
                    <h4
                      style={{
                        fontSize: '17px' ,
                        fontWeight: 600,
                        lineHeight: 1.4,
                        marginBottom: '10px'
                      }}
                      className="font-display text-[var(--text-primary)]"
                    >
                      {paperDetails.title}
                    </h4>

                    {/* Meta stats */}
                    <div
                      style={{
                        fontSize: '15px' ,
                        marginBottom: '8px',
                        lineHeight: 1.5
                      }}
                      className="flex flex-col gap-1 font-mono text-[var(--text-tertiary)]"
                    >
                      <span>Published: {paperDetails.year || 'N/A'}</span>
                      <span>Citations: {(paperDetails.citation_count || 0).toLocaleString()}</span>
                    </div>

                    {/* Abstract snippet */}
                    {paperDetails.abstract && (
                      <div>
                        <span className="font-ui text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                          Abstract Snapshot
                        </span>
                        <p
                          style={{
                            fontSize: '15px' ,
                            lineHeight: 1.65,
                            color: 'var(--text-secondary)'
                          }}
                          className="font-body leading-relaxed max-h-[220px] overflow-y-auto pr-1"
                        >
                          {paperDetails.abstract.length > 320 
                            ? `${paperDetails.abstract.slice(0, 320)}...` 
                            : paperDetails.abstract}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
                    <span className="text-xs text-[var(--text-tertiary)] font-body">
                      No metadata found in database.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button at bottom */}
              {paperDetails && paperDetails.doi && (
                <div className="pt-4 border-t border-[var(--border)]">
                  <a
                    href={paperDetails.doi}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '15px' ,
                      fontWeight: 500
                    }}
                    className="btn-primary w-full text-center flex items-center justify-center gap-2 py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Open Paper
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
