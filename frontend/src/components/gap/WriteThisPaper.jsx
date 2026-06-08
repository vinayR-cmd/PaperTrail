import { useState } from 'react'
import { searchAPI } from '../../lib/api'
import ResearchBrief from './ResearchBrief'
import { BookOpen, Sparkles, Target, Compass, Newspaper, Award, Clock } from 'lucide-react'

export default function WriteThisPaper({ gap }) {
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generateBrief() {
    setLoading(true)
    setError(null)
    try {
      const res = await searchAPI.generateBrief(gap)
      setBrief(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to generate brief')
    } finally {
      setLoading(false)
    }
  }

  if (brief) return <ResearchBrief brief={brief} gap={gap} />

  const items = [
    { icon: <Target size={16} style={{ color: 'var(--accent-blue)' }} />, label: 'Refined research question' },
    { icon: <Compass size={16} style={{ color: 'var(--accent-violet)' }} />, label: '3-section methodology' },
    { icon: <BookOpen size={16} style={{ color: 'var(--success)' }} />, label: 'Top papers to cite' },
    { icon: <Newspaper size={16} style={{ color: 'var(--warning)' }} />, label: 'Target journal suggestion' },
    { icon: <Award size={16} style={{ color: 'var(--danger)' }} />, label: 'Expected contribution' },
    { icon: <Clock size={16} style={{ color: 'var(--text-secondary)' }} />, label: 'Estimated timeline' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{
        padding: '32px', textAlign: 'center',
        background: 'rgba(79,142,247,0.03)',
        borderColor: 'rgba(79,142,247,0.1)'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'rgba(79,142,247,0.1)',
          border: '1px solid rgba(79,142,247,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <BookOpen size={24} color="var(--accent-blue)" />
        </div>

        <h2 style={{
          fontSize: '25px' , fontFamily: 'var(--font-display)',
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px'
        }}>Write This Paper</h2>

        <p style={{
          fontSize: '17px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.7,
          maxWidth: '520px', margin: '0 auto 28px'
        }}>
          Generate a complete research starter kit for this gap.
          Includes a refined research question, suggested methodology,
          top papers to cite, and the ideal journal to target.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px', maxWidth: '480px', margin: '0 auto 28px',
          textAlign: 'left'
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px', border: '1px solid var(--border-subtle)'
            }}>
              {item.icon}
              <span style={{
                fontSize: '14px' , color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)'
              }}>{item.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px', padding: '12px', marginBottom: '20px',
            fontSize: '15px' , color: 'var(--danger)', fontFamily: 'var(--font-ui)'
          }}>{error}</div>
        )}

        <button
          onClick={generateBrief}
          disabled={loading}
          className="btn-primary"
          style={{
            fontSize: '17px' , padding: '14px 32px',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Generating your research brief...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Research Brief
            </>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </button>

        <p style={{
          fontSize: '14px' , color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui)', marginTop: '12px'
        }}>
          Takes ~10 seconds · Powered by Groq LLaMA 3.1
        </p>
      </div>
    </div>
  )
}
