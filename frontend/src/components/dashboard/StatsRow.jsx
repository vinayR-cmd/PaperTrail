import { Search, Compass, Star, BookOpen } from 'lucide-react'

export default function StatsRow({ stats, loading }) {
  const items = [
    { label: 'Total Searches', value: stats.searches, icon: <Search size={18} style={{ color: 'var(--accent)' }} /> },
    { label: 'Unique Topics', value: stats.uniqueTopics, icon: <Compass size={18} style={{ color: 'var(--accent)' }} /> },
    { label: 'Saved Gaps', value: stats.savedGaps, icon: <Star size={18} style={{ color: 'var(--accent)' }} /> },
    { label: 'Topics Available', value: stats.topics, icon: <BookOpen size={18} style={{ color: 'var(--accent)' }} /> },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '32px'
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'background-color 0.2s, border-color 0.2s'
        }}>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '8px',
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center'
          }}>{item.icon}</div>
          <div>
            {loading ? (
              <div style={{
                width: '40px', height: '28px',
                background: 'var(--bg-surface)',
                borderRadius: '4px', marginBottom: '4px'
              }} />
            ) : (
              <p style={{
                fontSize: '37px' ,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>{item.value}</p>
            )}
            <p style={{
              fontSize: '15px' ,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 500
            }}>{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
