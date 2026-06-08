import { Bookmark, BookmarkX } from 'lucide-react'

export default function SavedGapsList({
  gaps, loading, navigate, onUnsave, showAll, fullView
}) {

  function scoreColor(score) {
    if (score >= 70) return 'var(--success)'
    if (score >= 40) return 'var(--accent)'
    return 'var(--text-tertiary)'
  }

  if (loading) return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <p style={{
        fontSize: '15px' ,
        fontWeight: 700,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '16px'
      }}>Saved Gaps</p>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: '52px', background: 'var(--bg-surface)',
          borderRadius: '8px', marginBottom: '8px',
          animation: 'sgPulse 1.5s ease infinite'
        }} />
      ))}
      <style>{`@keyframes sgPulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
    </div>
  )

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      transition: 'background-color 0.2s, border-color 0.2s'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bookmark size={14} color="var(--text-tertiary)" />
          <p style={{
            fontSize: '15px' ,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>Saved Gaps</p>
        </div>
        {!fullView && showAll && gaps.length > 0 && (
          <button
            onClick={showAll}
            style={{
              background: 'none', border: 'none',
              color: 'var(--accent)', fontSize: '14px' ,
              fontFamily: 'var(--font-ui)', cursor: 'pointer', padding: 0
            }}
          >View all →</button>
        )}
      </div>

      {gaps.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{
            fontSize: '15px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)', marginBottom: '8px'
          }}>No saved gaps yet</p>
          <p style={{
            fontSize: '14px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)', lineHeight: 1.5
          }}>
            Save interesting gaps from search results to review them here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {gaps.map((gap, i) => (
            <div
              key={gap.id || i}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '10px 12px',
                borderRadius: '8px', background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.15s', gap: '8px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.background = 'var(--accent-light)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
            >
              <div
                style={{ flex: 1 }}
                onClick={() => navigate(`/search?q=${encodeURIComponent(gap.topic_slug)}`)}
              >
                <p style={{
                  fontSize: '16px' ,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.4,
                  marginBottom: '6px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>{gap.gap_title}</p>
                <div style={{
                  fontSize: '15px' ,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {gap.gap_score && (
                    <span style={{
                      color: 'var(--accent)',
                      fontWeight: 600
                    }}>Score: {gap.gap_score}</span>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-ui)'
                  }}>
                    {new Date(gap.saved_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onUnsave(gap.id) }}
                title="Remove from saved"
                style={{
                  background: 'none', border: 'none',
                  padding: '4px', cursor: 'pointer',
                  color: 'var(--text-secondary)', display: 'flex',
                  transition: 'color 0.2s', flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <BookmarkX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
