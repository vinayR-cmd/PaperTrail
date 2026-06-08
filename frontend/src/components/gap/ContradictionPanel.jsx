import { CheckCircle2, AlertTriangle } from 'lucide-react'

export default function ContradictionPanel({ gap }) {
  if (!gap.contradictions || gap.contradictions.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--success)' }}>
          <CheckCircle2 size={48} />
        </div>
        <h3 style={{
          fontSize: '21px' , fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)', marginBottom: '8px'
        }}>No Contradictions Detected</h3>
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', maxWidth: '400px',
          margin: '0 auto', lineHeight: 1.6
        }}>
          The NLI model found no significant contradictions between papers in this
          gap zone. The communities may be complementary rather than conflicting.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '20px' }}>
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.6
        }}>
          The DeBERTa NLI model detected {gap.contradiction_count} pairs of papers
          with conflicting findings. These unresolved debates represent high-value
          research opportunities — a study that definitively resolves one of these
          contradictions would be immediately cited by both communities.
        </p>
      </div>

      {gap.contradictions.map((c, i) => (
        <div key={i} className="glass-card" style={{
          padding: '24px',
          borderColor: 'rgba(245,158,11,0.2)',
          background: 'rgba(245,158,11,0.03)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <span style={{
                fontSize: '14px' , fontFamily: 'var(--font-ui)',
                fontWeight: 600, color: 'var(--warning)',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Contradiction #{i + 1}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '13px' , color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-ui)'
              }}>Conflict strength</span>
              <div style={{
                width: '80px', height: '6px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '3px', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(c.contradiction_score || 0) * 100}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  borderRadius: '3px'
                }} />
              </div>
              <span style={{
                fontSize: '14px' , fontFamily: 'var(--font-ui)',
                fontWeight: 600, color: 'var(--warning)'
              }}>{Math.round((c.contradiction_score || 0) * 100)}%</span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '16px', alignItems: 'start'
          }}>
            {/* Paper A */}
            <div style={{
              padding: '16px',
              background: 'rgba(79,142,247,0.06)',
              border: '1px solid rgba(79,142,247,0.15)',
              borderRadius: '10px'
            }}>
              <div style={{
                fontSize: '12px' , color: 'var(--accent-blue)',
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: '8px'
              }}>Paper A — Claims</div>
              <p style={{
                fontSize: '15px' , color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', lineHeight: 1.5,
                marginBottom: '8px', fontWeight: 500
              }}>{c.paper_a_title}</p>
              {c.paper_a_abstract_snippet && (
                <p style={{
                  fontSize: '14px' , color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', lineHeight: 1.5,
                  fontStyle: 'italic'
                }}>"{c.paper_a_abstract_snippet}"</p>
              )}
            </div>

            {/* VS divider */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', paddingTop: '24px'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px' , fontFamily: 'var(--font-ui)',
                fontWeight: 700, color: 'var(--warning)'
              }}>VS</div>
            </div>

            {/* Paper B */}
            <div style={{
              padding: '16px',
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: '10px'
            }}>
              <div style={{
                fontSize: '12px' , color: 'var(--accent-violet)',
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: '8px'
              }}>Paper B — Contradicts</div>
              <p style={{
                fontSize: '15px' , color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', lineHeight: 1.5,
                marginBottom: '8px', fontWeight: 500
              }}>{c.paper_b_title}</p>
              {c.paper_b_abstract_snippet && (
                <p style={{
                  fontSize: '14px' , color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', lineHeight: 1.5,
                  fontStyle: 'italic'
                }}>"{c.paper_b_abstract_snippet}"</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
