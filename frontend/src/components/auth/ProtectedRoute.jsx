import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  // CRITICAL: Show nothing while auth is loading
  // This prevents the flash redirect on refresh
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            fontSize: '55px' ,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: 'var(--accent)',
            marginBottom: '16px'
          }}>P</div>
          <div style={{
            width: '120px',
            height: '2px',
            background: '#eff0fe',
            borderRadius: '1px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'var(--accent)',
              animation: 'loading-bar 1.5s ease infinite',
              borderRadius: '1px'
            }}/>
          </div>
          <style>{`
            @keyframes loading-bar {
              0% { width: 0%; margin-left: 0 }
              50% { width: 60%; margin-left: 20% }
              100% { width: 0%; margin-left: 100% }
            }
          `}</style>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }
  
  return children
}
