import { useState } from 'react'
import { Copy, Check, Target, FileText, Compass, BookOpen, Newspaper, Award, Clock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResearchBrief({ brief, gap }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = `
RESEARCH BRIEF — PaperTrail
Generated: ${new Date().toLocaleDateString()}
Gap: ${gap.gap_label}
Score: ${gap.gap_score}/100

RESEARCH QUESTION
${brief.refined_question}

ABSTRACT DRAFT
${brief.abstract_draft}

METHODOLOGY
${brief.methodology}

TOP PAPERS TO CITE
${(brief.top_papers || []).map((p, i) =>
  `${i + 1}. ${p.title} (${p.year}) — ${p.reason}`
).join('\n')}

TARGET JOURNAL
${brief.target_journal}
${brief.journal_reason}

EXPECTED CONTRIBUTION
${brief.expected_contribution}

ESTIMATED TIMELINE
${brief.timeline}
    `.trim()

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Research brief copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const sections = [
    {
      id: 'question',
      label: 'Refined Research Question',
      icon: <Target size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />,
      color: 'var(--accent-blue)',
      content: (
        <p style={{
          fontSize: '18px' , color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.7,
          fontStyle: 'italic',
          borderLeft: '3px solid var(--accent-blue)',
          paddingLeft: '16px'
        }}>{brief.refined_question}</p>
      )
    },
    {
      id: 'abstract',
      label: 'Draft Abstract',
      icon: <FileText size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />,
      color: 'var(--accent-cyan)',
      content: (
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.8
        }}>{brief.abstract_draft}</p>
      )
    },
    {
      id: 'methodology',
      label: 'Suggested Methodology',
      icon: <Compass size={18} style={{ color: 'var(--accent-violet)', flexShrink: 0 }} />,
      color: 'var(--accent-violet)',
      content: (
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.8
        }}>{brief.methodology}</p>
      )
    },
    {
      id: 'papers',
      label: 'Top Papers to Cite',
      icon: <BookOpen size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />,
      color: 'var(--success)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(brief.top_papers || []).map((paper, i) => (
            <div key={i} style={{
              display: 'flex', gap: '12px', padding: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px', alignItems: 'flex-start'
            }}>
              <span style={{
                flexShrink: 0, width: '24px', height: '24px',
                borderRadius: '50%',
                background: 'rgba(16,217,126,0.1)',
                border: '1px solid rgba(16,217,126,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px' , fontFamily: 'var(--font-ui)',
                fontWeight: 700, color: 'var(--success)'
              }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '15px' , color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', marginBottom: '4px',
                  fontWeight: 500
                }}>{paper.title}</p>
                <p style={{
                  fontSize: '13px' , color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)', marginBottom: '4px'
                }}>
                  {paper.year}
                  {paper.doi && (
                    <> · <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
                    >View paper ↗</a></>
                  )}
                </p>
                {paper.reason && (
                  <p style={{
                    fontSize: '14px' , color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', fontStyle: 'italic'
                  }}>{paper.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'journal',
      label: 'Target Journal',
      icon: <Newspaper size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />,
      color: 'var(--warning)',
      content: (
        <div>
          <p style={{
            fontSize: '18px' , color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)', fontWeight: 600,
            marginBottom: '8px'
          }}>{brief.target_journal}</p>
          <p style={{
            fontSize: '16px' , color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', lineHeight: 1.6
          }}>{brief.journal_reason}</p>
        </div>
      )
    },
    {
      id: 'contribution',
      label: 'Expected Contribution',
      icon: <Award size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />,
      color: 'var(--danger)',
      content: (
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.7
        }}>{brief.expected_contribution}</p>
      )
    },
    {
      id: 'timeline',
      label: 'Estimated Timeline',
      icon: <Clock size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />,
      color: 'var(--text-secondary)',
      content: (
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.7
        }}>{brief.timeline}</p>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="glass-card" style={{
        padding: '20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(16,217,126,0.04)',
        borderColor: 'rgba(16,217,126,0.15)'
      }}>
        <div>
          <p style={{
            fontSize: '15px' , color: 'var(--success)',
            fontFamily: 'var(--font-ui)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={15} />
            Research Brief Generated
          </p>
          <p style={{
            fontSize: '14px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)'
          }}>
            {new Date().toLocaleDateString()} · Powered by LLaMA 3.1
          </p>
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            background: copied ? 'rgba(16,217,126,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? 'rgba(16,217,126,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '8px',
            color: copied ? 'var(--success)' : 'var(--text-secondary)',
            fontSize: '15px' , fontFamily: 'var(--font-ui)',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy All'}
        </button>
      </div>

      {sections.map(section => (
        <div key={section.id} className="glass-card" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: '8px', marginBottom: '16px'
          }}>
            {section.icon}
            <h3 style={{
              fontSize: '14px' , fontFamily: 'var(--font-ui)',
              fontWeight: 600, color: section.color,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>{section.label}</h3>
          </div>
          {section.content}
        </div>
      ))}
    </div>
  )
}
