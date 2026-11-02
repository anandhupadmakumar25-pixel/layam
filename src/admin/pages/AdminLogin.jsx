import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import './AdminLogin.css'

function AdminLogin() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const redirectTo = location.state?.from?.pathname || '/admin'

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your username/email and password.')
      return
    }

    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setErrorMessage(err.message || 'Invalid administrator credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card fade-up">
        <div className="admin-login-card__brand">
          <img
            src="/layam-logo.png"
            alt="Layam Wedding Cinemas"
            className="admin-login-card__logo-img"
          />
          <span className="admin-login-card__eyebrow">STUDIO ADMIN PORTAL</span>
          <h1 className="admin-login-card__title">Studio Admin Login</h1>
          <p className="admin-login-card__subtitle">
            Enter your credentials to access the studio management dashboard, event archives, and photos.
          </p>
        </div>

        {errorMessage && (
          <div className="admin-login-card__alert" role="alert">
            {errorMessage}
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <div className="admin-login-form__field">
            <label htmlFor="admin-identifier">Username or Email Address</label>
            <input
              id="admin-identifier"
              type="text"
              autoComplete="username"
              placeholder="Username or email address"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="admin-login-form__field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your secret password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold admin-login-form__submit hover-elevate"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In to Studio Dashboard →'}
          </button>
        </form>

        <div className="admin-login-card__footer">
          <Link to="/" className="admin-login-card__back">
            &larr; Return to Public Photography Website
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin

