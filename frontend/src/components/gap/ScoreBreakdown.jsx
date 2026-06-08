export default function ScoreBreakdown({ gap }) {
  const totalPapers = gap.cluster_a_size + gap.cluster_b_size
  const gapDensity = gap.bridge_paper_count / Math.max(totalPapers, 1)
  const densityScore = Math.round(Math.max(0, 100 - gapDensity * 1000))

  const currentYear = new Date().getFullYear()
  const recentA = gap.top_papers_a?.filter(p => p.year >= currentYear - 5).length || 0
  const recentB = gap.top_papers_b?.filter(p => p.year >= currentYear - 5).length || 0
  const totalSample = (gap.top_papers_a?.length || 0) + (gap.top_papers_b?.length || 0)
  const velocityScore = Math.round(((recentA + recentB) / Math.max(totalSample, 1)) * 100)

  const allSamplePapers = (gap.top_papers_a || []).concat(gap.top_papers_b || [])
  const avgCitations = allSamplePapers.reduce((s, p) => s + (p.citation_count || 0), 0) /
    Math.max(allSamplePapers.length, 1)
  const bridgeScore = Math.min(100, Math.round(avgCitations / 1000))

  const components = [
    {
      label: 'Gap Density',
      description: 'How empty the space between communities is',
      score: densityScore,
      weight: '40%',
      color: '#4f8ef7',
      detail: `${gap.bridge_paper_count} bridge papers between ${totalPapers} total papers`
    },
    {
      label: 'Research Velocity',
      description: 'How fast surrounding fields are growing',
      score: velocityScore,
      weight: '40%',
      color: '#22d3ee',
      detail: `${recentA + recentB} of ${totalSample} sample papers published in last 5 years`
    },
    {
      label: 'Bridge Potential',
      description: 'Impact potential based on boundary paper citations',
      score: bridgeScore,
      weight: '20%',
      color: '#7c3aed',
      detail: `Average ${Math.round(avgCitations).toLocaleString()} citations on sample papers`
    }
  ]

  const scoreColor = gap.gap_score >= 70 ? 'var(--success)' :
    gap.gap_score >= 40 ? 'var(--accent-blue)' : 'var(--text-secondary)'

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '15px' , fontFamily: 'var(--font-ui)',
          fontWeight: 600, color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.08em'
        }}>Gap Score Breakdown</h3>
        <div style={{
          fontSize: '28px' , fontFamily: 'var(--font-display)',
          fontWeight: 700, color: scoreColor
        }}>
          {gap.gap_score}
          <span style={{
            fontSize: '14px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)', marginLeft: '4px', fontWeight: 400
          }}>/100</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {components.map((comp, i) => (
          <div key={i}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '8px'
            }}>
              <div>
                <span style={{
                  fontSize: '16px' , color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', fontWeight: 500, marginRight: '8px'
                }}>{comp.label}</span>
                <span style={{
                  fontSize: '13px' , color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)'
                }}>weight: {comp.weight}</span>
              </div>
              <span style={{
                fontSize: '18px' , fontFamily: 'var(--font-display)',
                fontWeight: 700, color: comp.color
              }}>{comp.score}</span>
            </div>
            <div style={{
              height: '6px', background: 'rgba(255,255,255,0.05)',
              borderRadius: '3px', overflow: 'hidden', marginBottom: '6px'
            }}>
              <div style={{
                height: '100%', width: `${comp.score}%`,
                background: comp.color, borderRadius: '3px',
                boxShadow: `0 0 8px ${comp.color}60`,
                transition: 'width 1s cubic-bezier(0.4,0,0.2,1)'
              }} />
            </div>
            <p style={{
              fontSize: '14px' , color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-body)'
            }}>{comp.detail}</p>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '20px', paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '13px' , color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-mono)', textAlign: 'center'
      }}>
        score = (density × 0.4) + (velocity × 0.4) + (bridge × 0.2)
      </div>
    </div>
  )
}
