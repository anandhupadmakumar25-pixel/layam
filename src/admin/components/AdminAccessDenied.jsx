import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import './AdminAccessDenied.css'

function AdminAccessDenied({ moduleTitle = 'Restricted Studio Section' }) {
  const { user, isSuperAdmin, permissions } = useAuth()

  return (
    <div className="admin-access-denied">
      <div className="admin-access-denied__card">
        <div className="admin-access-denied__badge">
          <span>SEC-403</span>
        </div>
        <div className="admin-access-denied__icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className="admin-access-denied__eyebrow">AUTHORIZATION ENFORCEMENT</span>
        <h2 className="admin-access-denied__title">Access Restricted</h2>
        <p className="admin-access-denied__desc">
          Your administrative role does not grant permission to enter <strong>{moduleTitle}</strong>.
          Module permissions are strictly provisioned and audited by the Super Administrator.
        </p>

        <div className="admin-access-denied__meta">
          <div className="admin-access-denied__meta-row">
            <span>Signed In As:</span>
            <strong>{user?.username} ({isSuperAdmin ? 'Super Admin' : 'Regular Admin'})</strong>
          </div>
          <div className="admin-access-denied__meta-row">
            <span>Assigned Permissions:</span>
            <div className="admin-access-denied__pills">
              {permissions && permissions.length > 0 ? (
                permissions.map((p) => (
                  <span key={p} className="admin-access-denied__pill">
                    {p}
                  </span>
                ))
              ) : (
                <span className="admin-access-denied__pill is-muted">Overview Only</span>
              )}
            </div>
          </div>
        </div>

        <div className="admin-access-denied__actions">
          <Link to="/admin" className="admin-access-denied__btn">
            Return to Studio Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminAccessDenied

