import { Trash2, ChevronRight, Clock } from 'lucide-react'

export default function RecentSearches({
  history, loading, navigate, onDelete, showAll, fullView
}) {

  function handleSearchClick(item) {
    sessionStorage.removeItem('papertrail_search_cache')
    navigate(`/search?q=${encodeURIComponent(item.query)}`)
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
      }}>Recent Searches</p>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: '52px', background: 'var(--bg-surface)',
          borderRadius: '8px', marginBottom: '8px',
          animation: 'rsPulse 1.5s ease infinite'
        }} />
      ))}
      <style>{`@keyframes rsPulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
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
          <Clock size={14} color="var(--text-tertiary)" />
          <p style={{
            fontSize: '15px' ,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>Recent Searches</p>
        </div>
        {!fullView && showAll && history.length > 0 && (
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

      {history.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{
            fontSize: '15px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)', marginBottom: '12px'
          }}>No searches yet</p>
          <button
            onClick={() => navigate('/search')}
            className="btn-primary"
            style={{ fontSize: '14px' , padding: '8px 16px' }}
          >Start searching →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {history.map((item, i) => (
            <div
              key={item.id || i}
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
              <div style={{ flex: 1 }} onClick={() => handleSearchClick(item)}>
                <p style={{
                  fontSize: '17px' ,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  marginBottom: '3px',
                  textTransform: 'capitalize'
                }}>{item.query}</p>
                <p style={{
                  fontSize: '15px' ,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)'
                }}>
                  {item.result_count} gaps ·{' '}
                  {new Date(item.searched_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <ChevronRight
                  size={14}
                  color="var(--text-tertiary)"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSearchClick(item)}
                />
                <button
                  onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                  style={{
                    background: 'none', border: 'none',
                    padding: '4px', cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex', transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
