import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GapScore from './GapScore'
import useScrollReveal from '../../hooks/useScrollReveal'
import { AlertTriangle, Clipboard, ClipboardCheck, Network, ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function GapCard({ gap, index, onViewGraph }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const cardRef = useScrollReveal()
  const [copied, setCopied] = useState(false)

  async function saveGap() {
    if (!user) { toast.error('Sign in to save gaps'); return }
    if (saved) { toast('Already saved!'); return }
    try {
      await supabase.from('saved_gaps').insert({
        user_id: user.id,
        topic_slug: gap.topic_slug,
        gap_title: gap.gap_label,
        gap_summary: gap.llm_explanation?.substring(0, 200),
        gap_score: gap.gap_score
      })
      setSaved(true)
      toast.success('Gap saved to dashboard!')
    } catch (e) {
      toast.error('Could not save gap')
    }
  }

  const handleCopy = async () => {
    const briefText = `Gap: ${gap.gap_label}
Score: ${gap.gap_score}
Question: ${gap.llm_research_question || 'N/A'}
Methodology: ${gap.llm_methodology || 'N/A'}`

    try {
      await navigator.clipboard.writeText(briefText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  // Determine urgency color scheme
  const getUrgencyBadge = (urgency) => {
    const defaultStyle = {
      background: 'rgba(122, 139, 163, 0.15)',
      border: '1px solid rgba(122, 139, 163, 0.3)',
      color: '#7a8ba3'
    }

    if (!urgency) return { label: 'STABLE', style: defaultStyle }

    switch (urgency.toUpperCase()) {
      case 'URGENT':
        return {
          label: 'URGENT',
          style: {
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444'
          }
        }
      case 'ACTIVE':
        return {
          label: 'ACTIVE',
          style: {
            background: 'rgba(79, 142, 247, 0.15)',
            border: '1px solid rgba(79, 142, 247, 0.3)',
            color: '#4f8ef7'
          }
        }
      case 'STABLE':
        return {
          label: 'STABLE',
          style: defaultStyle
        }
      default:
        return {
          label: urgency,
          style: defaultStyle
        }
    }
  }

  const badge = getUrgencyBadge(gap.combined_urgency)

  return (
    <div
      ref={cardRef}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '28px 36px',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.15s, border-color 0.15s, background-color 0.2s',
        transitionDelay: `${index * 0.1}s`
      }}
      className="reveal relative overflow-hidden group hover:bg-gradient-to-b hover:from-[rgba(79,142,247,0.03)] hover:to-transparent duration-500"
    >
      {/* Top micro border-accent glow on card hover */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ flex: 1 }}>
          {/* Gap Number */}
          <span className="font-ui text-xs text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
            Gap #{index + 1}
          </span>
          {/* Gap Title / Label */}
          <h3
            style={{
              fontSize: '23px' ,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              marginBottom: '12px'
            }}
            className="line-clamp-2"
          >
            {gap.gap_label}
          </h3>
        </div>

        {/* Score and Urgency Badge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          flexShrink: 0
        }}>
          <span
            style={badge.style}
            className="text-[10px] font-ui font-semibold px-2.5 py-0.5 rounded-full tracking-wider"
          >
            {badge.label}
          </span>
          <GapScore score={gap.gap_score} size={80} />
        </div>
      </div>

      <hr
        style={{
          borderTop: '1px solid var(--border)',
          margin: '20px 0'
        }}
      />

      <div className="mb-6">
        <h4
          style={{
            fontSize: '13px' ,
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}
        >
          Research Intelligence
        </h4>
        <p
          style={{
            fontSize: '17px' ,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.8,
            borderLeft: '3px solid var(--border)',
            paddingLeft: '16px',
            marginBottom: '20px'
          }}
        >
          {gap.llm_explanation || "No explanation report generated for this research gap."}
        </p>
      </div>

      {/* Research Question Highlight Box */}
      {gap.llm_research_question && (
        <div
          style={{
            padding: '16px 18px',
            marginTop: '16px'
          }}
          className="mb-6 rounded-xl border border-[rgba(79,142,247,0.25)] bg-[rgba(79,142,247,0.06)]"
        >
          <h5
            style={{
              fontSize: '13px' ,
              marginBottom: '8px'
            }}
            className="font-ui text-[var(--accent-blue)] uppercase tracking-widest font-semibold"
          >
            Suggested Research Question
          </h5>
          <p
            style={{
              fontSize: '16px' ,
              lineHeight: 1.65
            }}
            className="font-body text-[var(--text-primary)] italic"
          >
            "{gap.llm_research_question}"
          </p>
        </div>
      )}

      {/* Two Column Grid: Community Papers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '20px'
        }}
      >
        {/* Community A */}
        <div>
          <span
            style={{
              fontSize: '13px' ,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px',
              fontFamily: 'var(--font-ui)'
            }}
            className="block"
          >
            Community A ({gap.cluster_a_size} papers)
          </span>
          <div className="flex flex-col">
            {gap.top_papers_a?.slice(0, 2).map((paper, idx) => (
              <div key={paper.openalex_id || idx} style={{
                paddingBottom: '10px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--border)'
              }}>
                <p
                  style={{
                    fontSize: '16px' ,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.45,
                    marginBottom: '4px'
                  }}
                  className="font-medium line-clamp-2"
                >
                  {paper.title || "Untitled Document"}
                </p>
                <span
                  style={{
                    fontSize: '14px' ,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-ui)'
                  }}
                  className="block"
                >
                  {paper.year || "N/A"} · {(paper.citation_count || 0).toLocaleString()} citations
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Community B */}
        <div>
          <span
            style={{
              fontSize: '13px' ,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px',
              fontFamily: 'var(--font-ui)'
            }}
            className="block"
          >
            Community B ({gap.cluster_b_size} papers)
          </span>
          <div className="flex flex-col">
            {gap.top_papers_b?.slice(0, 2).map((paper, idx) => (
              <div key={paper.openalex_id || idx} style={{
                paddingBottom: '10px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--border)'
              }}>
                <p
                  style={{
                    fontSize: '16px' ,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.45,
                    marginBottom: '4px'
                  }}
                  className="font-medium line-clamp-2"
                >
                  {paper.title || "Untitled Document"}
                </p>
                <span
                  style={{
                    fontSize: '14px' ,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-ui)'
                  }}
                  className="block"
                >
                  {paper.year || "N/A"} · {(paper.citation_count || 0).toLocaleString()} citations
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contradiction Alert Box */}
      {gap.contradiction_count > 0 && (
        <div
          style={{
            padding: '14px 16px',
            gap: '12px'
          }}
          className="mb-6 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] flex items-start"
        >
          <AlertTriangle className="text-[var(--warning)] flex-shrink-0 mt-0.5" size={16} />
          <p
            style={{
              fontSize: '16px' ,
              lineHeight: 1.5
            }}
            className="text-[var(--warning)] font-body"
          >
            <span className="font-semibold">{gap.contradiction_count} unresolved contradictions</span> detected in the literature around this gap.
          </p>
        </div>
      )}

      {/* Bottom Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)'
        }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-[var(--border-subtle)] flex-wrap"
      >
        {/* Left: View Graph + Deep Dive */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onViewGraph(gap)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] flex items-center gap-1.5 hover:underline cursor-pointer transition-colors"
          >
            <Network size={14} />
            View Citation Graph →
          </button>
          <button
            onClick={() => navigate(`/gap/${gap.topic_slug}/${gap.gap_id}`, { state: { gap } })}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
            style={{ height: '32px' }}
          >
            <ArrowRight size={13} />
            Deep Dive
          </button>
          <button
            onClick={saveGap}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', height: '32px',
              background: saved ? 'var(--accent-light)' : 'var(--bg-card)',
              border: `1px solid ${saved ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
              borderRadius: '8px',
              color: saved ? '#7c3aed' : 'var(--text-secondary)',
              fontSize: '14px' , fontFamily: 'var(--font-ui)',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Middle: Urgency description */}
        <div
          style={{
            fontSize: '15px' 
          }}
          className="text-[var(--text-tertiary)] font-body leading-normal italic text-left sm:text-center max-w-[280px] md:max-w-md"
        >
          {gap.combined_urgency_label || "No trend prediction forecast available."}
        </div>

        {/* Right: Copy Brief */}
        <button
          onClick={handleCopy}
          className="btn-ghost flex items-center gap-1.5 py-1.5 px-3 text-xs transition-all cursor-pointer"
          style={{ height: '32px' }}
        >
          {copied ? (
            <>
              <ClipboardCheck size={14} className="text-[var(--success)]" />
              Copied
            </>
          ) : (
            <>
              <Clipboard size={14} />
              Copy Research Brief
            </>
          )}
        </button>
      </div>
    </div>
  )
}
