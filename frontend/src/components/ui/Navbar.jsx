import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { 
  Menu, X, LayoutDashboard, Settings, 
  LogOut, ChevronDown, Sun, Moon, Shield 
} from 'lucide-react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    navigate('/')
  }

  const navLinks = [
    { label: 'Research', path: '/search' },
    { label: 'Interdisciplinary', path: '/interdisciplinary' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 100, height: '60px',
        background: 'var(--bg-page)',
        opacity: 0.98,
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        transition: 'background-color 0.2s, border-color 0.2s'
      }}>
        <div style={{
          width: '100%', maxWidth: '1200px',
          margin: '0 auto', padding: '0 24px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}>

          {/* Logo */}
          <Link to="/" style={{
            fontSize: '21px' , fontWeight: 700,
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', gap: '2px'
          }}>
            <span style={{color: 'var(--accent)'}}>P</span>aperTrail
          </Link>

          {/* Desktop Nav */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '16px' ,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive(link.path)
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                  background: isActive(link.path)
                    ? 'var(--accent-light)'
                    : 'transparent',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive(link.path)) {
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive(link.path)) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                marginRight: '4px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-surface)'
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {!user ? (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="btn-ghost"
                  style={{padding: '7px 16px', fontSize: '16px' }}
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary"
                  style={{padding: '7px 16px', fontSize: '16px' }}
                >
                  Start free
                </button>
              </>
            ) : (
              <div style={{position: 'relative'}}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 12px',
                    background: dropdownOpen ? 'var(--bg-surface)' : 'transparent',
                    border: '1px solid',
                    borderColor: dropdownOpen ? 'var(--border-strong)' : 'transparent',
                    borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.borderColor = 'var(--border-strong)'
                  }}
                  onMouseLeave={e => {
                    if (!dropdownOpen) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                    }
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white', fontSize: '14px' , fontWeight: 700
                  }}>
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span style={{
                    fontSize: '15px' , fontFamily: 'var(--font-ui)',
                    fontWeight: 500, color: 'var(--text-primary)',
                    maxWidth: '120px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {user.email?.split('@')[0]}
                  </span>
                  <ChevronDown size={14} color="var(--text-tertiary)"
                    style={{
                      transform: dropdownOpen 
                        ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.15s'
                    }}
                  />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      style={{
                        position: 'fixed', inset: 0, zIndex: 49
                      }}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div style={{
                      position: 'absolute', top: '44px', right: 0,
                      width: '200px', zIndex: 50,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-md)',
                      padding: '6px',
                      display: 'flex', flexDirection: 'column', gap: '2px'
                    }}>
                      {[
                        { icon: <LayoutDashboard size={15}/>,
                          label: 'Dashboard', path: '/dashboard' },
                        { icon: <Settings size={15}/>,
                          label: 'Profile', path: '/profile' },
                        ...(profile?.is_admin || user?.email === import.meta.env.VITE_ADMIN_EMAIL ? [
                          { icon: <Shield size={15}/>,
                            label: 'Admin Panel', path: '/admin' }
                        ] : [])
                      ].map(item => (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path)
                            setDropdownOpen(false)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center',
                            gap: '10px', padding: '8px 10px',
                            borderRadius: '6px', border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            fontSize: '15px' , fontFamily: 'var(--font-ui)',
                            color: 'var(--text-primary)',
                            textAlign: 'left', width: '100%',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e =>
                            e.currentTarget.style.background = 'var(--bg-surface)'}
                          onMouseLeave={e =>
                            e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{color: 'var(--text-secondary)'}}>
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      ))}
                      <div style={{
                        height: '1px', background: 'var(--border)',
                        margin: '4px 0'
                      }}/>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'flex', alignItems: 'center',
                          gap: '10px', padding: '8px 10px',
                          borderRadius: '6px', border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          fontSize: '15px' , fontFamily: 'var(--font-ui)',
                          color: 'var(--danger)',
                          textAlign: 'left', width: '100%',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e =>
                          e.currentTarget.style.background = 'var(--accent-light)'}
                        onMouseLeave={e =>
                          e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={15}/>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}

