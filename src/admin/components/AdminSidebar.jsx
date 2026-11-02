import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import './AdminSidebar.css'

const ALL_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/admin', exact: true, moduleKey: 'dashboard', code: '01' },
  { label: 'Events & Live Hub', path: '/admin/events', exact: false, moduleKey: 'events', code: '02' },
  { label: 'Photo Gallery', path: '/admin/gallery', exact: false, moduleKey: 'gallery', code: '03' },
  { label: 'QR Passes', path: '/admin/qr-codes', exact: false, moduleKey: 'qr_codes', code: '04' },
  { label: 'AI Recognition', path: '/admin/recognition', exact: false, moduleKey: 'ai_recognition', code: '05' },
  { label: 'Guest Activity', path: '/admin/guest-activity', exact: false, moduleKey: 'guest_activity', code: '06' },
  {
    label: 'Staff Admins',
    path: '/admin/administrators',
    exact: false,
    moduleKey: 'administrators',
    superAdminOnly: true,
    code: '07',
  },
]

function AdminSidebar({ isOpen, onClose }) {
  const { isSuperAdmin, hasPermission, mustChangePassword, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    if (onClose) onClose()
    navigate('/admin/login', { replace: true })
  }

  // Filter items according to permissions
  const visibleItems = ALL_SIDEBAR_ITEMS.filter((item) => {
    if (item.superAdminOnly) {
      return isSuperAdmin
    }
    return hasPermission(item.moduleKey)
  })

  return (
    <>
      {isOpen && <div className="admin-sidebar__backdrop" onClick={onClose} />}
      <aside className={`admin-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Admin Sidebar">
        <div className="admin-sidebar__brand">
          <Link to="/admin" className="admin-sidebar__logo" onClick={onClose}>
            <img
              src="/layam-logo.png"
              alt="Layam Wedding Cinemas"
              className="admin-sidebar__logo-img"
            />
            <span className="admin-sidebar__role-tag">
              {isSuperAdmin ? 'SUPER ADMIN' : 'STUDIO ADMIN'}
            </span>
          </Link>
        </div>

        {mustChangePassword && (
          <div className="admin-sidebar__warning-box">
            <NavLink
              to="/admin/change-password"
              className="admin-sidebar__warning-link"
              onClick={onClose}
            >
              <span className="admin-sidebar__warning-dot" />
              <span>Password Change Required</span>
            </NavLink>
          </div>
        )}

        <nav className="admin-sidebar__nav">
          <span className="admin-sidebar__section-label">Management Suite</span>
          <ul className="admin-sidebar__list">
            {visibleItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `admin-sidebar__link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="admin-sidebar__code">{item.code}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="admin-sidebar__sec-divider" />
          <span className="admin-sidebar__section-label">Preferences</span>
          <ul className="admin-sidebar__list">
            <li>
              <NavLink
                to="/admin/change-password"
                className={({ isActive }) =>
                  `admin-sidebar__link ${isActive ? 'is-active' : ''}`
                }
                onClick={onClose}
              >
                <span className="admin-sidebar__code">09</span>
                <span>Change Password</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="admin-sidebar__footer">
          <Link to="/" className="admin-sidebar__public-link">
            &larr; Public Studio Website
          </Link>
          <button
            type="button"
            className="admin-sidebar__logout-btn"
            onClick={handleLogout}
          >
            <span>&times;</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar

