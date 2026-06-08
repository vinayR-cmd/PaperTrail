import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, TrendingUp, AlertTriangle, BookOpen, BarChart2 } from 'lucide-react'
import ScoreBreakdown from '../components/gap/ScoreBreakdown'
import TrendChart from '../components/gap/TrendChart'
import ContradictionPanel from '../components/gap/ContradictionPanel'
import WriteThisPaper from '../components/gap/WriteThisPaper'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'trends', label: 'Trend Analysis', icon: TrendingUp },
  { id: 'contradictions', label: 'Contradictions', icon: AlertTriangle },
  { id: 'write', label: 'Write This Paper', icon: BookOpen },
]

export default function GapDetail() {
  const { topicSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')

  const gap = location.state?.gap

  if (!gap) {
    return (
      <div style={{ paddingTop: '90px', position: 'relative', zIndex: 10, minHeight: '100vh' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <p style={{
            color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            fontSize: '18px' , marginBottom: '24px'
          }}>
            Gap data not found. Please return to search.
          </p>
          <button onClick={() => navigate('/search')} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const scoreColor = gap.gap_score >= 70 ? 'var(--success)' :
    gap.gap_score >= 40 ? 'var(--accent-blue)' : 'var(--text-secondary)'

  const urgencyBadgeStyle = gap.combined_urgency === 'URGENT'
    ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }
    : gap.combined_urgency === 'ACTIVE'
    ? { background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', color: '#4f8ef7' }
    : { background: 'rgba(122,139,163,0.15)', border: '1px solid rgba(122,139,163,0.3)', color: '#7a8ba3' }

  return (
    <div style={{ paddingTop: '90px', position: 'relative', zIndex: 10, minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/search')}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)',
            fontSize: '15px' , background: 'none', border: 'none',
            cursor: 'pointer', marginBottom: '32px', padding: 0,
            transition: 'color 0.2s'
          }}
        >
          <ArrowLeft size={14} />
          Back to results
        </button>

        {/* Hero header */}
        <div className="glass-card" style={{
          padding: '32px', marginBottom: '24px',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', gap: '24px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '13px' , fontFamily: 'var(--font-ui)',
                  fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--text-tertiary)'
                }}>Research Gap · {topicSlug}</span>
                <span style={{
                  ...urgencyBadgeStyle,
                  fontSize: '12px' , fontFamily: 'var(--font-ui)',
                  fontWeight: 600, padding: '2px 8px',
                  borderRadius: '20px', letterSpacing: '0.08em'
                }}>{gap.combined_urgency || 'STABLE'}</span>
              </div>

              <h1 style={{
                fontSize: '30px' , fontFamily: 'var(--font-display)',
                fontWeight: 700, color: 'var(--text-primary)',
                lineHeight: 1.3, marginBottom: '20px'
              }}>{gap.gap_label}</h1>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Community A', value: `${gap.cluster_a_size} papers` },
                  { label: 'Community B', value: `${gap.cluster_b_size} papers` },
                  { label: 'Bridge Papers', value: gap.bridge_paper_count },
                  { label: 'Contradictions', value: gap.contradiction_count || 0 },
                ].map((stat, i) => (
                  <div key={i}>
                    <p style={{
                      fontSize: '13px' , color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '2px'
                    }}>{stat.label}</p>
                    <p style={{
                      fontSize: '23px' , fontFamily: 'var(--font-display)',
                      fontWeight: 700, color: 'var(--text-primary)'
                    }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Score circle */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                border: `3px solid ${scoreColor}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 10px rgba(0, 0, 0, 0.04)`
              }}>
                <span style={{
                  fontSize: '32px' , fontFamily: 'var(--font-display)',
                  fontWeight: 700, color: scoreColor, lineHeight: 1
                }}>{gap.gap_score}</span>
                <span style={{
                  fontSize: '12px' , color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)'
                }}>/100</span>
              </div>
              <p style={{
                fontSize: '12px' , color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-ui)', marginTop: '6px',
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>Gap Score</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px', padding: '4px'
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '6px',
                  padding: '10px 12px', borderRadius: '8px',
                  border: isActive ? '1px solid rgba(67, 97, 238, 0.15)' : '1px solid transparent',
                  cursor: 'pointer', fontSize: '15px' ,
                  fontFamily: 'var(--font-ui)', fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s ease',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                }}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <ScoreBreakdown gap={gap} />}
        {activeTab === 'trends' && <TrendChart gap={gap} />}
        {activeTab === 'contradictions' && <ContradictionPanel gap={gap} />}
        {activeTab === 'write' && <WriteThisPaper gap={gap} />}
      </div>
    </div>
  )
}
