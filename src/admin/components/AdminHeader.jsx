import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import './AdminHeader.css'

function AdminHeader({ pageTitle, onToggleSidebar }) {
  const { user, isSuperAdmin } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)

  const displayName =
    !user?.full_name || user.full_name === 'Julian Vance'
      ? (user?.first_name || 'Layam')
      : user.full_name

  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <button
          type="button"
          className="admin-header__menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <Link to="/admin" className="admin-header__mobile-logo">
          <img
            src="/layam-logo.png"
            alt="Layam Wedding Cinemas"
            className="admin-header__mobile-logo-img"
          />
        </Link>

        <div className="admin-header__title-group">
          <span className="admin-header__brand-pill">LAYAM WEDDING CINEMAS</span>
          <h1 className="admin-header__title">{pageTitle}</h1>
        </div>
      </div>

      <div className="admin-header__right">
        {/* Notification Icon & Dropdown */}
        <div className="admin-header__notif-wrap">
          <button
            type="button"
            className="admin-header__notif-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Studio notifications"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="admin-header__notif-dot" />
          </button>

          {showNotifications && (
            <div className="admin-header__notif-dropdown">
              <div className="admin-header__notif-head">
                <strong>Studio Notifications</strong>
                <span>Live System</span>
              </div>
              <ul className="admin-header__notif-list">
                <li>
                  <span>Event CRUD API Connected</span>
                  <small>SQLite database synchronized</small>
                </li>
                <li>
                  <span>Lake Como Soirée Archive</span>
                  <small>Marked as Active gallery</small>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Administrator Profile Section */}
        <div className="admin-header__profile">
          <div className="admin-header__avatar" aria-hidden="true">
            <img src="/favicon.png" alt="Layam" className="admin-header__avatar-img" />
          </div>
          <div className="admin-header__profile-meta">
            <span className="admin-header__profile-name">{displayName}</span>
            <span className="admin-header__profile-role">
              <span className={`admin-header__role-badge ${isSuperAdmin ? 'is-super' : 'is-admin'}`}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
              <span className="admin-header__role-sep">&bull;</span>
              <span className="admin-header__role-email">{user?.email || 'Administrator'}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader

