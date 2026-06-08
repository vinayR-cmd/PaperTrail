import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const isAdmin = profile?.is_admin === true || user.email === import.meta.env.VITE_ADMIN_EMAIL

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
