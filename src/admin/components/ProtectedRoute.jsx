import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, mustChangePassword } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="admin-auth-loading">
        <div className="admin-auth-loading__box">
          <span className="admin-auth-loading__eyebrow">Layam Wedding Cinemas</span>
          <p>Verifying administrator credentials...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  if (mustChangePassword && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />
  }

  return children
}

export default ProtectedRoute

