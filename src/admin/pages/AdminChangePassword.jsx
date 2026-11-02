import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { changeAdminPassword } from '../../services/api.js'
import './AdminChangePassword.css'

function AdminChangePassword() {
  const { user, mustChangePassword, updateLocalUser } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!currentPassword) {
      setError('Please provide your current password.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    try {
      await changeAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      updateLocalUser({ must_change_password: false })
      setSuccess(true)
      setTimeout(() => {
        navigate('/admin', { replace: true })
      }, 1500)
    } catch (err) {
      const msg =
        err.fieldErrors?.new_password?.[0] ||
        err.fieldErrors?.current_password?.[0] ||
        err.fieldErrors?.detail ||
        err.message ||
        'Failed to change password. Please check your inputs.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-change-pwd">
      <div className="admin-change-pwd__container">
        {mustChangePassword && (
          <div className="admin-change-pwd__alert-forced">
            <div className="admin-change-pwd__alert-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <strong>Action Required: Temporary Password Detected</strong>
              <p>For studio security, you must establish a personal password before accessing studio modules.</p>
            </div>
          </div>
        )}

        <div className="admin-change-pwd__card">
          <div className="admin-change-pwd__header">
            <span className="admin-change-pwd__eyebrow">CREDENTIAL MANAGEMENT</span>
            <h2 className="admin-change-pwd__title">Change Administrator Password</h2>
            <p className="admin-change-pwd__subtitle">
              Account: <strong>{user?.username}</strong> &bull; {user?.email}
            </p>
          </div>

          {error && <div className="admin-change-pwd__error">{error}</div>}
          {success && (
            <div className="admin-change-pwd__success">
              Password successfully updated! Redirecting to Studio Dashboard...
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-change-pwd__form">
            <div className="admin-change-pwd__field">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current or temporary password"
                autoComplete="current-password"
                disabled={loading || success}
              />
            </div>

            <div className="admin-change-pwd__field">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={loading || success}
              />
              <span className="admin-change-pwd__hint">Must be at least 8 characters long.</span>
            </div>

            <div className="admin-change-pwd__field">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                disabled={loading || success}
              />
            </div>

            <div className="admin-change-pwd__actions">
              <button
                type="submit"
                className="admin-change-pwd__submit-btn"
                disabled={loading || success}
              >
                {loading ? 'Updating Credentials...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminChangePassword

