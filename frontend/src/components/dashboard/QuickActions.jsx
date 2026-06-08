import { Search, Compass, User } from 'lucide-react'

export default function QuickActions({ navigate }) {
  const actions = [
    {
      icon: <Search size={20} style={{ color: 'var(--accent)' }} />,
      label: 'New Search',
      desc: 'Find research gaps',
      onClick: () => navigate('/search')
    },
    {
      icon: <Compass size={20} style={{ color: 'var(--accent)' }} />,
      label: 'Interdisciplinary',
      desc: 'Cross-domain gaps',
      onClick: () => navigate('/interdisciplinary')
    },
    {
      icon: <User size={20} style={{ color: 'var(--accent)' }} />,
      label: 'Profile',
      desc: 'Account settings',
      onClick: () => navigate('/profile')
    }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '32px'
    }}>
      {actions.map((action, i) => (
        <div
          key={i}
          onClick={action.onClick}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.background = 'var(--bg-surface)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--bg-card)'
          }}
        >
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '8px',
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>{action.icon}</div>
          <div>
            <p style={{
              fontSize: '17px' ,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              marginBottom: '3px'
            }}>{action.label}</p>
            <p style={{
              fontSize: '15px' ,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)'
            }}>{action.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
