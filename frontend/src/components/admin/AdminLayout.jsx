import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Globe, TrendingUp, BarChart2, Award, Network, AlertTriangle, Clock, Users, Activity, Compass } from 'lucide-react'

export default function AdminLayout() {
  const navItems = [
    { label: 'Overview', path: '/admin', end: true, icon: <LayoutDashboard size={18} /> },
    { label: 'Research Map', path: '/admin/map', icon: <Globe size={18} /> },
    { label: 'Search Activity', path: '/admin/activity', icon: <TrendingUp size={18} /> },
    { label: 'Score Distribution', path: '/admin/distribution', icon: <BarChart2 size={18} /> },
    { label: 'Gap Leaderboard', path: '/admin/leaderboard', icon: <Award size={18} /> },
    { label: 'Citation Density', path: '/admin/density', icon: <Network size={18} /> },
    { label: 'Contradiction Stats', path: '/admin/contradictions', icon: <AlertTriangle size={18} /> },
    { label: 'Data Freshness', path: '/admin/freshness', icon: <Clock size={18} /> },
    { label: 'User Growth', path: '/admin/users', icon: <Users size={18} /> },
    { label: 'Pipeline Monitor', path: '/admin/pipeline', icon: <Activity size={18} /> },
    { label: 'Frontier Map', path: '/admin/frontier', icon: <Compass size={18} /> }
  ]

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 60px)',
      marginTop: '60px',
      background: 'var(--bg-page)',
      color: 'var(--text-primary)'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ 
          padding: '0 12px 16px', 
          marginBottom: '8px', 
          borderBottom: '1px solid var(--border)',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Admin Panel
        </div>
        
        {navItems.map(item => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 500,
              color: isActive ? 'var(--accent)' : 'var(--text-primary)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.15s ease'
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <Outlet />
      </main>
    </div>
  )
}
