import { useAuth } from '../../hooks/useAuth.jsx'
import './AdminPlaceholder.css'

function AdminSettings() {
  const { user } = useAuth()

  return (
    <div className="admin-placeholder-page">
      <div className="admin-placeholder-card fade-up">
        <span className="admin-placeholder-card__badge">Studio Configuration</span>
        <h2 className="admin-placeholder-card__title">Studio &amp; Cloud Settings</h2>
        <p className="admin-placeholder-card__desc">
          Signed in as <strong>{user?.full_name || user?.username}</strong> (
          <code>{user?.email || 'staff'}</code>). Advanced studio branding, watermark presets,
          Cloudflare D1/R2 credentials, and AI recognition thresholds will be configurable here in
          upcoming phases.
        </p>

        <div className="admin-placeholder-card__roadmap">
          <h3>Upcoming Configuration Controls</h3>
          <ul>
            <li>Cloudflare R2 bucket &amp; CDN custom domain settings</li>
            <li>Cloudflare D1 &amp; Worker edge synchronization toggles</li>
            <li>AI Face Recognition confidence threshold &amp; privacy retention policies</li>
            <li>Custom studio watermark and downloadable print resolution presets</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings

