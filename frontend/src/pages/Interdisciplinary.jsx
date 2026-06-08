import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAPI } from '../lib/api'
import { ArrowLeft, Zap, GitMerge, AlertTriangle } from 'lucide-react'

const PRESETS = [
  ['Machine Learning', 'Drug Discovery'],
  ['Quantum Computing', 'Cryptography'],
  ['Neuroscience', 'Artificial Intelligence'],
  ['Climate Science', 'Economics'],
  ['Genomics', 'Computer Vision'],
  ['Materials Science', 'Energy Storage'],
]

const STAGES = [
  'Resolving research concepts...',
  'Indexing field A papers...',
  'Indexing field B papers...',
  'Building merged citation graph...',
  'Finding intersection gaps...',
  'Generating intelligence report...',
]

export default function Interdisciplinary() {
  const navigate = useNavigate()
  const [topicA, setTopicA] = useState('')
  const [topicB, setTopicB] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [stage, setStage] = useState(0)

  function scoreColor(score) {
    if (score >= 70) return '#10d97e'
    if (score >= 40) return '#4f8ef7'
    return '#7a8ba3'
  }

  async function handleAnalyze() {
    if (!topicA.trim() || !topicB.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setStage(0)

    const timer = setInterval(() => {
      setStage(s => Math.min(s + 1, STAGES.length - 1))
    }, 12000)

    try {
      const res = await searchAPI.findInterdisciplinaryGaps(topicA, topicB, 500)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Analysis failed')
    } finally {
      clearInterval(timer)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '90px 24px 80px',
      maxWidth: '900px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 10
    }}>

      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none',
          color: 'var(--text-tertiary)', fontSize: '15px' ,
          fontFamily: 'var(--font-ui)', cursor: 'pointer',
          marginBottom: '32px', padding: 0
        }}
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </button>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '4px 14px',
          background: 'var(--accent-light)',
          border: '1px solid rgba(67, 97, 238, 0.15)',
          borderRadius: '99px', marginBottom: '16px'
        }}>
          <GitMerge size={12} color="var(--accent)" />
          <span style={{
            fontSize: '13px' , color: 'var(--accent)',
            fontFamily: 'var(--font-ui)', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase'
          }}>Interdisciplinary Analysis</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-0.02em',
          color: 'var(--text-primary)', marginBottom: '12px'
        }}>
          Find gaps at the{' '}
          <span style={{
            background: 'linear-gradient(135deg, #22d3ee, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>intersection.</span>
        </h1>
        <p style={{
          fontSize: '18px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.6,
          maxWidth: '560px'
        }}>
          Enter two research fields. PaperTrail merges their citation graphs and
          finds structural gaps at their intersection — the most valuable
          unexplored territory in science.
        </p>
      </div>

      {/* Dual Input */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '16px', alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{
              fontSize: '13px' , color: '#4f8ef7',
              fontFamily: 'var(--font-ui)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              display: 'block', marginBottom: '8px'
            }}>Field A</label>
            <input
              value={topicA}
              onChange={e => setTopicA(e.target.value)}
              placeholder="e.g. Machine Learning"
              onFocus={e => e.target.style.borderColor = '#4f8ef7'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px', padding: '14px 16px',
                color: 'var(--text-primary)', fontSize: '17px' ,
                fontFamily: 'var(--font-body)', outline: 'none',
                transition: 'all 0.2s, background-color 0.2s', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--accent-light)',
            border: '1px solid rgba(67, 97, 238, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: '23px' , fontWeight: 300,
            marginTop: '22px', flexShrink: 0
          }}>+</div>

          <div>
            <label style={{
              fontSize: '13px' , color: '#7c3aed',
              fontFamily: 'var(--font-ui)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              display: 'block', marginBottom: '8px'
            }}>Field B</label>
            <input
              value={topicB}
              onChange={e => setTopicB(e.target.value)}
              placeholder="e.g. Drug Discovery"
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px', padding: '14px 16px',
                color: 'var(--text-primary)', fontSize: '17px' ,
                fontFamily: 'var(--font-body)', outline: 'none',
                transition: 'all 0.2s, background-color 0.2s', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !topicA.trim() || !topicB.trim()}
          className="btn-primary"
          style={{
            width: '100%', padding: '14px', fontSize: '17px' ,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
            opacity: (!topicA.trim() || !topicB.trim()) ? 0.5 : 1,
            cursor: (!topicA.trim() || !topicB.trim() || loading)
              ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'interSpin 0.8s linear infinite'
              }} />
              {STAGES[stage]}
            </>
          ) : (
            <>
              <Zap size={16} />
              Analyze Intersection
            </>
          )}
        </button>
        <style>{`@keyframes interSpin { to { transform: rotate(360deg) } }`}</style>
      </div>

      {/* Preset Pairs */}
      {!result && !loading && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '14px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '12px'
          }}>Try these combinations</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESETS.map(([a, b], i) => (
              <button
                key={i}
                onClick={() => { setTopicA(a); setTopicB(b) }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--accent-light)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.background = 'var(--bg-card)'
                }}
                style={{
                  padding: '7px 14px', borderRadius: '99px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontSize: '14px' ,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                  transition: 'all 0.2s', outline: 'none'
                }}
              >{a} × {b}</button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card" style={{
          padding: '20px',
          borderColor: 'rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.05)'
        }}>
          <p style={{ color: '#ef4444', fontSize: '16px' , fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {error}
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Score hero */}
          <div className="glass-card" style={{
            padding: '28px',
            background: `${scoreColor(result.gap_score)}08`,
            borderColor: `${scoreColor(result.gap_score)}25`
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: '24px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: '10px', marginBottom: '12px'
                }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '99px',
                    background: 'rgba(34,211,238,0.1)',
                    border: '1px solid rgba(34,211,238,0.2)',
                    fontSize: '13px' , fontFamily: 'var(--font-ui)',
                    fontWeight: 600, color: '#22d3ee',
                    textTransform: 'uppercase', letterSpacing: '0.08em'
                  }}>Intersection Gap</span>
                </div>
                <h2 style={{
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  color: 'var(--text-primary)', marginBottom: '16px',
                  lineHeight: 1.2
                }}>
                  <span style={{ color: '#4f8ef7' }}>{result.topic_a}</span>
                  {' '}&times;{' '}
                  <span style={{ color: '#7c3aed' }}>{result.topic_b}</span>
                </h2>
                <p style={{
                  fontSize: '17px' , color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', lineHeight: 1.7,
                  borderLeft: '2px solid rgba(34,211,238,0.4)',
                  paddingLeft: '16px'
                }}>{result.llm_explanation}</p>
              </div>

              <div style={{
                flexShrink: 0, textAlign: 'center', padding: '20px',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                minWidth: '100px'
              }}>
                <p style={{
                  fontSize: '46px' , fontFamily: 'var(--font-display)',
                  fontWeight: 700, color: scoreColor(result.gap_score),
                  lineHeight: 1
                }}>{result.gap_score}</p>
                <p style={{
                  fontSize: '12px' , color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginTop: '4px'
                }}>GAP SCORE</p>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px', marginTop: '20px', paddingTop: '20px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              {[
                { label: `${result.topic_a} papers`, value: result.papers_in_a },
                { label: `${result.topic_b} papers`, value: result.papers_in_b },
                { label: 'Cross-citations', value: result.cross_citations },
                { label: 'Bridge papers', value: result.bridge_papers },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: '23px' , fontFamily: 'var(--font-display)',
                    fontWeight: 700, color: 'var(--text-primary)'
                  }}>{s.value}</p>
                  <p style={{
                    fontSize: '13px' , color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-ui)'
                  }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunity */}
          <div className="glass-card" style={{
            padding: '24px',
            background: 'rgba(79,142,247,0.04)',
            borderColor: 'rgba(79,142,247,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Zap size={14} color="#4f8ef7" />
              <h3 style={{
                fontSize: '13px' , fontFamily: 'var(--font-ui)',
                fontWeight: 600, color: '#4f8ef7',
                textTransform: 'uppercase', letterSpacing: '0.1em'
              }}>Research Opportunity</h3>
            </div>
            <p style={{
              fontSize: '17px' , color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', lineHeight: 1.7,
              marginBottom: '16px', fontStyle: 'italic'
            }}>{result.llm_research_question}</p>
            <p style={{
              fontSize: '16px' , color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', lineHeight: 1.6
            }}>{result.llm_methodology}</p>
          </div>

          {/* Why unique */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <p style={{
              fontSize: '14px' , color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '8px'
            }}>Why This Gap Is Unique</p>
            <p style={{
              fontSize: '16px' , color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', lineHeight: 1.6
            }}>{result.llm_why_unique}</p>
          </div>

          {/* Papers side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: result.topic_a, papers: result.top_papers_a, color: '#4f8ef7' },
              { label: result.topic_b, papers: result.top_papers_b, color: '#7c3aed' },
            ].map((field, fi) => (
              <div key={fi} className="glass-card" style={{ padding: '20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: '8px', marginBottom: '16px'
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: field.color,
                    boxShadow: `0 0 8px ${field.color}`
                  }} />
                  <p style={{
                    fontSize: '14px' , fontFamily: 'var(--font-ui)',
                    fontWeight: 600, color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.08em'
                  }}>{field.label}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(field.papers || []).slice(0, 5).map((p, pi) => (
                    <div key={pi} style={{
                      padding: '10px',
                      background: 'var(--bg-surface)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)'
                    }}>
                      <p style={{
                        fontSize: '14px' , color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)', lineHeight: 1.4,
                        marginBottom: '4px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>{p.title}</p>
                      <p style={{
                        fontSize: '12px' , color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-ui)'
                      }}>
                        {p.year} · {p.citation_count?.toLocaleString()} citations
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
