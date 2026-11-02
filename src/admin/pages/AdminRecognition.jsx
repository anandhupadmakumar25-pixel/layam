import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchEventRecognitionDashboard,
  fetchEvents,
  purgeEventBiometricEmbeddings,
  retryFailedEventRecognition,
  revokeEventGuestSessions,
  startEventRecognitionIndexing,
  updateEventRecognitionConfig,
} from '../../services/api.js'
import './AdminRecognition.css'

function formatTimestamp(isoString) {
  if (!isoString) return '—'
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) return isoString
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function AdminRecognition() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState(() => {
    const param = searchParams.get('event')
    return param ? Number(param) : null
  })

  const [dashboard, setDashboard] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState('')
  const [feedback, setFeedback] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Editable form state for EventRecognitionConfig
  const [formEnabled, setFormEnabled] = useState(false)
  const [formMode, setFormMode] = useState('development_test')
  const [formConsent, setFormConsent] = useState(false)
  const [formRetentionDays, setFormRetentionDays] = useState(90)
  const [formSessionTtlMinutes, setFormSessionTtlMinutes] = useState(60)
  const [formThreshold, setFormThreshold] = useState(0.363)

  // Confirmation modal: null | 'purge' | 'reindex_all' | 'revoke_sessions'
  const [confirmModal, setConfirmModal] = useState(null)

  const syncFormWithDashboard = useCallback((data) => {
    if (!data) return
    setFormEnabled(Boolean(data.recognition_enabled))
    setFormMode(data.processing_mode || 'development_test')
    setFormConsent(Boolean(data.consent_confirmed))
    setFormRetentionDays(data.retention_days ?? 90)
    setFormSessionTtlMinutes(data.guest_session_ttl_minutes ?? 60)
    setFormThreshold(data.similarity_threshold ?? 0.363)
  }, [])

  // 1. Load events list
  const loadEventsList = useCallback(async () => {
    setEventsLoading(true)
    try {
      const data = await fetchEvents()
      const list = Array.isArray(data) ? data : []
      setEvents(list)

      if (list.length > 0) {
        const paramId = Number(searchParams.get('event'))
        const matching = list.find((ev) => ev.id === paramId)
        if (matching) {
          setSelectedEventId(matching.id)
        } else if (!selectedEventId || !list.some((ev) => ev.id === selectedEventId)) {
          setSelectedEventId(list[0].id)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load studio events.')
    } finally {
      setEventsLoading(false)
    }
  }, [searchParams, selectedEventId])

  useEffect(() => {
    loadEventsList()
  }, [loadEventsList])

  // 2. Load recognition dashboard for selected event
  const loadRecognitionDashboard = useCallback(
    async (silent = false) => {
      if (!selectedEventId) return
      if (!silent) setDashboardLoading(true)
      try {
        const data = await fetchEventRecognitionDashboard(selectedEventId)
        setDashboard(data)
        if (!silent) {
          syncFormWithDashboard(data)
        }
      } catch (err) {
        if (!silent) {
          setErrorMsg(err.message || 'Unable to load AI recognition status for this event.')
        }
      } finally {
        if (!silent) setDashboardLoading(false)
      }
    },
    [selectedEventId, syncFormWithDashboard]
  )

  useEffect(() => {
    loadRecognitionDashboard(false)
  }, [loadRecognitionDashboard])

  // Poll automatically while an indexing job is Pending or Processing
  const hasActiveJob = Boolean(
    dashboard?.active_job ||
      dashboard?.job_history?.some(
        (j) => j.status === 'Pending' || j.status === 'Processing'
      )
  )

  useEffect(() => {
    if (!hasActiveJob || !selectedEventId) return undefined
    const timer = window.setInterval(() => {
      loadRecognitionDashboard(true)
    }, 1500)
    return () => window.clearInterval(timer)
  }, [hasActiveJob, selectedEventId, loadRecognitionDashboard])

  const handleSelectEvent = (nextId) => {
    const idNum = Number(nextId)
    setSelectedEventId(idNum)
    setFeedback('')
    setErrorMsg('')
    setSearchParams({ event: String(idNum) })
  }

  const handleSaveConfig = async (e) => {
    e.preventDefault()
    if (!selectedEventId) return
    setActionBusy('save-config')
    setFeedback('')
    setErrorMsg('')
    try {
      const updated = await updateEventRecognitionConfig(selectedEventId, {
        recognition_enabled: formEnabled,
        processing_mode: formMode,
        consent_confirmed: formConsent,
        retention_days: Number(formRetentionDays),
        guest_session_ttl_minutes: Number(formSessionTtlMinutes),
        similarity_threshold: Number(formThreshold),
      })
      setDashboard(updated)
      syncFormWithDashboard(updated)
      setFeedback(updated.detail || 'Saved AI recognition configuration.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update recognition configuration.')
    } finally {
      setActionBusy('')
    }
  }

  const handleQuickToggleRecognition = async (nextEnabled) => {
    if (!selectedEventId) return
    setActionBusy('toggle-enable')
    setFeedback('')
    setErrorMsg('')
    try {
      const updated = await updateEventRecognitionConfig(selectedEventId, {
        recognition_enabled: nextEnabled,
        processing_mode: formMode,
        consent_confirmed: nextEnabled ? true : formConsent,
        retention_days: Number(formRetentionDays),
        similarity_threshold: Number(formThreshold),
      })
      setDashboard(updated)
      syncFormWithDashboard(updated)
      setFeedback(
        nextEnabled
          ? `AI Face Recognition enabled for "${updated.event_name}".`
          : `AI Face Recognition disabled for "${updated.event_name}".`
      )
    } catch (err) {
      setErrorMsg(err.message || 'Unable to toggle recognition status.')
    } finally {
      setActionBusy('')
    }
  }

  const handleStartIndexing = async (jobType = 'index_unindexed') => {
    if (!selectedEventId) return
    setConfirmModal(null)
    setActionBusy(jobType)
    setFeedback('')
    setErrorMsg('')
    try {
      const res = await startEventRecognitionIndexing(selectedEventId, jobType)
      setDashboard(res)
      setFeedback(res.detail || 'Started photograph face indexing job.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start face indexing job.')
    } finally {
      setActionBusy('')
    }
  }

  const handleRetryFailed = async () => {
    if (!selectedEventId) return
    setActionBusy('retry_failed')
    setFeedback('')
    setErrorMsg('')
    try {
      const res = await retryFailedEventRecognition(selectedEventId)
      setDashboard(res)
      setFeedback(res.detail || 'Started retry job for failed photographs.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retry failed photographs.')
    } finally {
      setActionBusy('')
    }
  }

  const handleConfirmedPurgeEmbeddings = async () => {
    if (!selectedEventId) return
    setConfirmModal(null)
    setActionBusy('purge')
    setFeedback('')
    setErrorMsg('')
    try {
      const res = await purgeEventBiometricEmbeddings(selectedEventId)
      setDashboard(res)
      setFeedback(res.detail || 'Purged all biometric face embeddings for this event.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to purge biometric embeddings.')
    } finally {
      setActionBusy('')
    }
  }

  const handleConfirmedRevokeGuestSessions = async () => {
    if (!selectedEventId) return
    setConfirmModal(null)
    setActionBusy('revoke-sessions')
    setFeedback('')
    setErrorMsg('')
    try {
      const res = await revokeEventGuestSessions(selectedEventId)
      setDashboard(res)
      setFeedback(
        res.detail || 'Revoked all active guest recognition sessions for this event.'
      )
    } catch (err) {
      setErrorMsg(err.message || 'Failed to revoke guest recognition sessions.')
    } finally {
      setActionBusy('')
    }
  }

  const activeEvent = events.find((ev) => ev.id === selectedEventId) || null
  const totalPhotos = dashboard?.total_photos ?? 0
  const indexedPhotos = dashboard?.indexed_photos ?? 0
  const failedPhotos = dashboard?.failed_photos ?? 0
  const unindexedPhotos = dashboard?.unindexed_photos ?? 0
  const detectedFaces = dashboard?.detected_faces ?? 0
  const isReady = Boolean(dashboard?.is_ready_for_indexing)
  const isEnabled = Boolean(dashboard?.recognition_enabled)
  const processingMode = dashboard?.processing_mode || 'development_test'

  const overallPercent =
    totalPhotos > 0 ? Math.min(100, Math.round((indexedPhotos / totalPhotos) * 100)) : 0

  if (eventsLoading) {
    return (
      <div className="admin-rec-page">
        <div className="admin-rec-empty">
          <p>Loading studio events and AI face recognition engine...</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="admin-rec-page">
        <div className="admin-rec-empty">
          <h3>No Studio Events Available</h3>
          <p>Create an event and upload test photographs before running AI face indexing.</p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/admin/events?action=new" className="btn btn-primary">
              + Create First Event
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-rec-page">
      {/* 1. Event Selector & Readiness Banner */}
      <section className="admin-rec__selector-card">
        <div className="admin-rec__selector-info">
          <span className="admin-rec__eyebrow">Biometric Indexing &amp; Vector Engine</span>
          <h2>{activeEvent ? activeEvent.name : 'Select a Studio Event'}</h2>
          {activeEvent && (
            <p className="admin-rec__event-meta">
              {activeEvent.event_date} &bull; {activeEvent.location} &bull;{' '}
              <span
                className={`admin-rec__mode-pill ${
                  processingMode === 'production_authorized'
                    ? 'mode-pill--prod'
                    : 'mode-pill--dev'
                }`}
              >
                {processingMode === 'production_authorized'
                  ? 'Authorised Production Mode'
                  : 'Development / Test Mode Only'}
              </span>
            </p>
          )}
        </div>

        <div className="admin-rec__selector-controls">
          <label htmlFor="rec-event-select">Select Studio Event</label>
          <select
            id="rec-event-select"
            value={selectedEventId || ''}
            onChange={(e) => handleSelectEvent(e.target.value)}
            className="admin-rec__select"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.event_date}) — {ev.photo_count ?? 0} photos
              </option>
            ))}
          </select>
        </div>
      </section>

      {feedback && (
        <div className="admin-rec__feedback" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')}>
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="admin-rec__error" role="alert">
          {errorMsg}
        </div>
      )}

      {dashboardLoading && !dashboard ? (
        <div className="admin-rec-empty">
          <p>Loading event biometric indexing metrics...</p>
        </div>
      ) : (
        <>
          {/* 2. KPI Metrics Strip */}
          <section className="admin-rec__kpi-grid" aria-label="Recognition Indexing Metrics">
            <div className="admin-rec__kpi-card">
              <span className="admin-rec__kpi-label">Recognition Readiness</span>
              <strong
                className={`admin-rec__kpi-status ${
                  isReady ? 'status-text--ready' : 'status-text--paused'
                }`}
              >
                {isReady ? 'Ready & Authorised' : 'Disabled / Unauthorised'}
              </strong>
              <small>
                {processingMode === 'production_authorized'
                  ? 'Authorised Production Event'
                  : 'Development / Test Photos Only'}
              </small>
            </div>

            <div className="admin-rec__kpi-card">
              <span className="admin-rec__kpi-label">Total Photographs</span>
              <strong className="admin-rec__kpi-value">{totalPhotos}</strong>
              <small>{unindexedPhotos} unindexed remaining</small>
            </div>

            <div className="admin-rec__kpi-card">
              <span className="admin-rec__kpi-label">Indexed Photographs</span>
              <strong className="admin-rec__kpi-value">{indexedPhotos}</strong>
              <small>{overallPercent}% of event gallery indexed</small>
            </div>

            <div className="admin-rec__kpi-card">
              <span className="admin-rec__kpi-label">Detected Faces</span>
              <strong className="admin-rec__kpi-value">{detectedFaces}</strong>
              <small>128-D L2-normalized SFace vectors</small>
            </div>

            <div className="admin-rec__kpi-card">
              <span className="admin-rec__kpi-label">Failed Photographs</span>
              <strong
                className={`admin-rec__kpi-value ${
                  failedPhotos > 0 ? 'status-text--danger' : ''
                }`}
              >
                {failedPhotos}
              </strong>
              <small>
                {failedPhotos > 0 ? 'Eligible for retry below' : 'Zero indexing failures'}
              </small>
            </div>
          </section>

          {/* 3. Indexing Progress & Action Bar */}
          <section className="admin-rec__indexing-card">
            <div className="admin-rec__indexing-head">
              <div>
                <span className="admin-rec__eyebrow">Event Photograph Indexing</span>
                <h3>Batch Face Detection &amp; Embedding Generation</h3>
              </div>

              <div className="admin-rec__quick-toggle">
                {isEnabled ? (
                  <button
                    type="button"
                    className="btn btn-outline admin-rec__btn-warning"
                    disabled={Boolean(actionBusy)}
                    onClick={() => handleQuickToggleRecognition(false)}
                  >
                    Disable Recognition
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={Boolean(actionBusy)}
                    onClick={() => handleQuickToggleRecognition(true)}
                  >
                    Authorize &amp; Enable Recognition
                  </button>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="admin-rec__progress-wrap">
              <div className="admin-rec__progress-labels">
                <span>
                  Gallery Indexing Progress: <strong>{indexedPhotos}</strong> of{' '}
                  <strong>{totalPhotos}</strong> photographs completed
                  {hasActiveJob ? ' (Indexing in progress...)' : ''}
                </span>
                <strong>{overallPercent}%</strong>
              </div>
              <div
                className="admin-rec__progress-track"
                role="progressbar"
                aria-valuenow={overallPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`admin-rec__progress-fill ${hasActiveJob ? 'is-animating' : ''}`}
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>

            {!isReady && (
              <div className="admin-rec__auth-notice">
                <strong>Biometric Safeguard Active:</strong> Real-event indexing is disabled by
                default. To start indexing photographs for <strong>{activeEvent?.name}</strong>,
                enable recognition and confirm biometric authorization in the controls below (or
                click <em>Authorize &amp; Enable Recognition</em> above).
              </div>
            )}

            <div className="admin-rec__action-bar">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!isReady || Boolean(actionBusy) || hasActiveJob || totalPhotos === 0}
                onClick={() => handleStartIndexing('index_unindexed')}
              >
                {actionBusy === 'index_unindexed' || hasActiveJob
                  ? 'Indexing Photographs...'
                  : `Start Indexing (${unindexedPhotos} Unindexed)`}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                disabled={!isReady || Boolean(actionBusy) || hasActiveJob || failedPhotos === 0}
                onClick={handleRetryFailed}
              >
                {actionBusy === 'retry_failed'
                  ? 'Retrying...'
                  : `Retry Failed Photographs (${failedPhotos})`}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                disabled={!isReady || Boolean(actionBusy) || hasActiveJob || totalPhotos === 0}
                onClick={() => setConfirmModal('reindex_all')}
              >
                Re-Index Entire Event
              </button>

              <button
                type="button"
                className="btn btn-outline admin-rec__btn-danger"
                disabled={
                  Boolean(actionBusy) ||
                  hasActiveJob ||
                  (detectedFaces === 0 && indexedPhotos === 0 && failedPhotos === 0)
                }
                onClick={() => setConfirmModal('purge')}
              >
                Purge Event Face Embeddings
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => loadRecognitionDashboard(false)}
              >
                Refresh Status
              </button>
            </div>
          </section>

          {/* 4. Two-Column Configuration & Model Provenance */}
          <div className="admin-rec__two-col">
            {/* Left: Biometric Authorization & Threshold Controls */}
            <form className="admin-rec__config-card" onSubmit={handleSaveConfig}>
              <span className="admin-rec__eyebrow">Biometric Governance &amp; Readiness</span>
              <h3>Event Recognition Settings</h3>
              <p className="admin-rec__card-desc">
                Distinguish between development/test photograph indexing and authorised production
                event processing. Configure biometric retention and similarity threshold settings.
              </p>

              <div className="admin-rec__form-group">
                <label htmlFor="rec-mode-select">Processing Environment Mode</label>
                <select
                  id="rec-mode-select"
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className="admin-rec__input"
                >
                  <option value="development_test">
                    Development / Authorised Test Photographs Only
                  </option>
                  <option value="production_authorized">
                    Authorised Production Event Processing
                  </option>
                </select>
              </div>

              <div className="admin-rec__checkbox-group">
                <label className="admin-rec__checkbox-label">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                  />
                  <span>Enable AI Face Recognition for this Event</span>
                </label>

                <label className="admin-rec__checkbox-label">
                  <input
                    type="checkbox"
                    checked={formConsent}
                    onChange={(e) => setFormConsent(e.target.checked)}
                  />
                  <span>
                    Confirm photographic &amp; biometric processing authorization is documented for
                    this event
                  </span>
                </label>
              </div>

              <div className="admin-rec__form-row">
                <div className="admin-rec__form-group">
                  <label htmlFor="rec-threshold-input">
                    Cosine Similarity Threshold (0.10 – 0.99)
                  </label>
                  <input
                    id="rec-threshold-input"
                    type="number"
                    step="0.001"
                    min="0.1"
                    max="0.99"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="admin-rec__input"
                  />
                  <small>
                    SFace LFW default is <code>0.363</code>. Must be calibrated on consented
                    validation data before production rollout.
                  </small>
                </div>

                <div className="admin-rec__form-group">
                  <label htmlFor="rec-retention-input">Biometric Retention Policy (Days)</label>
                  <input
                    id="rec-retention-input"
                    type="number"
                    min="1"
                    max="3650"
                    value={formRetentionDays}
                    onChange={(e) => setFormRetentionDays(e.target.value)}
                    className="admin-rec__input"
                  />
                  <small>
                    Number of days face embeddings are retained before automated retention cleanup.
                  </small>
                </div>
              </div>

              <div className="admin-rec__form-group">
                <label htmlFor="rec-session-ttl-input">
                  Guest Session Expiry / Retention (Minutes)
                </label>
                <input
                  id="rec-session-ttl-input"
                  type="number"
                  min="5"
                  max="1440"
                  value={formSessionTtlMinutes}
                  onChange={(e) => setFormSessionTtlMinutes(e.target.value)}
                  className="admin-rec__input"
                />
                <small>
                  Duration (5 – 1440 minutes) before a consented guest preview session automatically
                  expires.
                </small>
              </div>

              <div className="admin-rec__form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={Boolean(actionBusy)}
                >
                  {actionBusy === 'save-config'
                    ? 'Saving Configuration...'
                    : 'Save Recognition Settings'}
                </button>
              </div>
            </form>

            {/* Right: Model Licensing & Biometric Protection Summary */}
            <div className="admin-rec__model-card">
              <span className="admin-rec__eyebrow">Engine &amp; Licensing Provenance</span>
              <h3>OpenCV Zoo YuNet + SFace Pipeline</h3>
              <p className="admin-rec__card-desc">
                Selected for permissive commercial-compatible open-source licensing and fast CPU/GPU
                ONNX inference without InsightFace non-commercial weight restrictions.
              </p>

              <dl className="admin-rec__model-dl">
                <div>
                  <dt>Face Detection Model</dt>
                  <dd>
                    <code>{dashboard?.model_info?.detector_model || 'opencv_yunet'}</code> (
                    {dashboard?.model_info?.detector_version || '2023mar'}) —{' '}
                    <strong>{dashboard?.model_info?.detector_license || 'MIT License'}</strong>
                  </dd>
                </div>
                <div>
                  <dt>Face Embedding Model</dt>
                  <dd>
                    <code>{dashboard?.model_info?.embedding_model || 'opencv_sface'}</code> (
                    {dashboard?.model_info?.embedding_version || '2021dec'}) —{' '}
                    <strong>
                      {dashboard?.model_info?.embedding_license || 'Apache License 2.0'}
                    </strong>
                  </dd>
                </div>
                <div>
                  <dt>Vector Representation</dt>
                  <dd>
                    {dashboard?.model_info?.embedding_dimension || 128}-D L2-Normalized Float32
                    Vector (Cosine Similarity)
                  </dd>
                </div>
                <div>
                  <dt>Biometric Data Safeguards</dt>
                  <dd>
                    Embeddings are never exposed in public APIs or photo serializers, no face crops
                    are written to disk, and deleting a photograph or event automatically cascades
                    deletion of all associated face vectors.
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 5. Privacy-Safe Guest Consent & Matching Telemetry (Phase 8) */}
          <section className="admin-rec__history-card" aria-label="Guest Consent and Matching Activity">
            <div className="admin-rec__history-head">
              <div>
                <span className="admin-rec__eyebrow">Phase 8 &bull; Privacy-Preserving Telemetry</span>
                <h3>Guest Consent &amp; Selfie Matching Activity</h3>
              </div>
              <button
                type="button"
                className="btn btn-outline admin-rec__btn-warning"
                disabled={
                  Boolean(actionBusy) ||
                  (dashboard?.guest_activity?.active_sessions ?? 0) === 0
                }
                onClick={() => setConfirmModal('revoke_sessions')}
              >
                Expire / Revoke Active Guest Sessions (
                {dashboard?.guest_activity?.active_sessions ?? 0})
              </button>
            </div>

            <div className="admin-rec__kpi-grid" style={{ marginBottom: '0.5rem' }}>
              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Guest Consents</span>
                <strong className="admin-rec__kpi-value">
                  {dashboard?.guest_activity?.guest_consent_count ?? 0}
                </strong>
                <small>
                  {dashboard?.guest_activity?.adult_consent_count ?? 0} adult &bull;{' '}
                  {dashboard?.guest_activity?.guardian_consent_count ?? 0} guardian &bull;{' '}
                  {dashboard?.guest_activity?.guest_declined_count ?? 0} declined
                </small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Matching Attempts</span>
                <strong className="admin-rec__kpi-value">
                  {dashboard?.guest_activity?.matching_attempts ?? 0}
                </strong>
                <small>
                  Avg top similarity:{' '}
                  {dashboard?.guest_activity?.similarity_diagnostics?.average_top_similarity ??
                    '—'}{' '}
                  (admin only)
                </small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Successful Sessions</span>
                <strong className="admin-rec__kpi-value status-text--ready">
                  {dashboard?.guest_activity?.successful_matching_sessions ?? 0}
                </strong>
                <small>Sessions with &ge; 1 matched photo</small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">No-Match Sessions</span>
                <strong className="admin-rec__kpi-value">
                  {dashboard?.guest_activity?.no_match_sessions ?? 0}
                </strong>
                <small>
                  {dashboard?.guest_activity?.failed_attempts ?? 0} rejected/failed selfie uploads
                </small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Expired / Revoked</span>
                <strong className="admin-rec__kpi-value">
                  {dashboard?.guest_activity?.expired_sessions ?? 0}
                </strong>
                <small>
                  {dashboard?.guest_activity?.active_sessions ?? 0} currently active session(s)
                </small>
              </div>
            </div>
          </section>

          {/* 5B. Guest Photo Download Telemetry (Phase 9) */}
          <section className="admin-rec__history-card" aria-label="Guest Photo Download Activity">
            <div className="admin-rec__history-head">
              <div>
                <span className="admin-rec__eyebrow">Phase 9 &bull; Secure Download Telemetry</span>
                <h3>Guest Photo &amp; ZIP Download Activity</h3>
              </div>
              <span>
                Privacy-preserving download audit (no raw tokens, signed URLs, or biometric data)
              </span>
            </div>

            <div className="admin-rec__kpi-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Individual Downloads</span>
                <strong className="admin-rec__kpi-value">
                  {dashboard?.download_activity?.individual_download_count ?? 0}
                </strong>
                <small>Completed single-photo downloads</small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">ZIP Archive Downloads</span>
                <strong className="admin-rec__kpi-value">
                  {dashboard?.download_activity?.zip_download_count ?? 0}
                </strong>
                <small>Completed &ldquo;Download All&rdquo; archives</small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Total Photos Downloaded</span>
                <strong className="admin-rec__kpi-value status-text--ready">
                  {dashboard?.download_activity?.total_photos_downloaded ?? 0}
                </strong>
                <small>Original event photographs delivered</small>
              </div>

              <div className="admin-rec__kpi-card">
                <span className="admin-rec__kpi-label">Failed / Blocked Attempts</span>
                <strong
                  className={`admin-rec__kpi-value ${
                    (dashboard?.download_activity?.failed_download_attempts ?? 0) > 0
                      ? 'status-text--danger'
                      : ''
                  }`}
                >
                  {dashboard?.download_activity?.failed_download_attempts ?? 0}
                </strong>
                <small>Unauthorized, limit-exceeded, or error</small>
              </div>
            </div>

            {/* Recent Download Activity for Selected Event */}
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.92rem', marginBottom: '0.6rem' }}>
                Recent Download Activity ({activeEvent?.name})
              </h4>
              {!dashboard?.download_activity?.recent_downloads ||
              dashboard.download_activity.recent_downloads.length === 0 ? (
                <p className="admin-rec__history-empty">
                  No guest download attempts have been recorded for this event yet.
                </p>
              ) : (
                <div className="admin-rec__table-wrap">
                  <table className="admin-rec__table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Photos</th>
                        <th>Processing</th>
                        <th>Session Ref</th>
                        <th>Reason / Category</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.download_activity.recent_downloads.map((rec) => (
                        <tr key={rec.id}>
                          <td>
                            <strong>#{rec.id}</strong>
                          </td>
                          <td>
                            {rec.download_type === 'zip' || rec.download_type === 'zip_all'
                              ? 'ZIP Archive'
                              : 'Individual Photo'}
                          </td>
                          <td>
                            <span
                              className={`admin-rec__job-status job-status--${
                                rec.status === 'completed' ? 'completed' : 'failed'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td>{rec.photo_count}</td>
                          <td>{rec.processing_ms} ms</td>
                          <td>
                            <code>{rec.session_reference || '—'}</code>
                          </td>
                          <td>{rec.error_category || '—'}</td>
                          <td>{formatTimestamp(rec.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Download Activity Grouped by Event */}
            {dashboard?.download_activity?.downloads_by_event?.length > 0 && (
              <div style={{ marginTop: '1.35rem' }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '0.6rem' }}>
                  Download Activity Grouped by Event
                </h4>
                <div className="admin-rec__table-wrap">
                  <table className="admin-rec__table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Individual Downloads</th>
                        <th>ZIP Downloads</th>
                        <th>Total Photos Delivered</th>
                        <th>Failed / Blocked Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.download_activity.downloads_by_event.map((evRow) => (
                        <tr key={evRow.event_id}>
                          <td>
                            <strong>{evRow.event_name}</strong>
                          </td>
                          <td>{evRow.individual_downloads}</td>
                          <td>{evRow.zip_downloads}</td>
                          <td>
                            <strong>{evRow.total_photos_downloaded}</strong>
                          </td>
                          <td>{evRow.failed_attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* 6. Failed Photographs Detail List (if any) */}
          {dashboard?.failed_photo_details?.length > 0 && (
            <section className="admin-rec__history-card">
              <div className="admin-rec__history-head">
                <h3>Failed Photographs ({failedPhotos})</h3>
                <span>Use &ldquo;Retry Failed Photographs&rdquo; above to re-run these files</span>
              </div>
              <div className="admin-rec__table-wrap">
                <table className="admin-rec__table">
                  <thead>
                    <tr>
                      <th>Photo ID</th>
                      <th>Filename</th>
                      <th>Error Reason</th>
                      <th>Last Attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.failed_photo_details.map((item) => (
                      <tr key={item.photo_id}>
                        <td>#{item.photo_id}</td>
                        <td>
                          <strong>{item.filename}</strong>
                        </td>
                        <td className="status-text--danger">{item.error_message}</td>
                        <td>{formatTimestamp(item.last_indexed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 6. Processing Job History Table */}
          <section className="admin-rec__history-card">
            <div className="admin-rec__history-head">
              <h3>Recognition Indexing Job History</h3>
              <span>Audit trail of batch indexing and retry runs for {activeEvent?.name}</span>
            </div>

            {!dashboard?.job_history || dashboard.job_history.length === 0 ? (
              <p className="admin-rec__history-empty">
                No indexing jobs have been executed for this event yet.
              </p>
            ) : (
              <div className="admin-rec__table-wrap">
                <table className="admin-rec__table">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Type</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th>Processed / Total</th>
                      <th>Detected Faces</th>
                      <th>Failed</th>
                      <th>Started</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.job_history.map((job) => (
                      <tr key={job.id}>
                        <td data-label="Job ID">
                          <strong>#{job.id}</strong>
                        </td>
                        <td data-label="Type">{job.job_type}</td>
                        <td data-label="Mode">
                          <span
                            className={`admin-rec__mode-pill ${
                              job.processing_mode === 'production_authorized'
                                ? 'mode-pill--prod'
                                : 'mode-pill--dev'
                            }`}
                          >
                            {job.processing_mode === 'production_authorized'
                              ? 'Production'
                              : 'Dev / Test'}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`admin-rec__job-status job-status--${(
                              job.status || 'pending'
                            )
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td data-label="Processed">
                          {job.processed_photos} / {job.total_photos} ({job.progress_percent}%)
                        </td>
                        <td data-label="Detected Faces">
                          <strong>{job.detected_faces}</strong>
                        </td>
                        <td data-label="Failed">{job.failed_photos}</td>
                        <td data-label="Started">{formatTimestamp(job.created_at)}</td>
                        <td data-label="Completed">{formatTimestamp(job.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Confirmation Modals */}
      {confirmModal && (
        <div className="admin-rec-modal" role="dialog" aria-modal="true">
          <div
            className="admin-rec-modal__backdrop"
            onClick={() => setConfirmModal(null)}
          />
          <div className="admin-rec-modal__dialog fade-up">
            {confirmModal === 'purge' ? (
              <>
                <span className="admin-rec__eyebrow" style={{ color: '#b91c1c' }}>
                  Biometric Data Deletion
                </span>
                <h3>Purge All Event Face Embeddings?</h3>
                <p>
                  This will permanently delete all <strong>{detectedFaces}</strong> stored facial
                  embeddings and reset indexing records for <strong>{activeEvent?.name}</strong>.
                  Original event photographs will not be deleted.
                </p>
                <div className="admin-rec-modal__actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary admin-rec__btn-confirm-danger"
                    onClick={handleConfirmedPurgeEmbeddings}
                  >
                    Yes, Purge All Embeddings
                  </button>
                </div>
              </>
            ) : confirmModal === 'revoke_sessions' ? (
              <>
                <span className="admin-rec__eyebrow" style={{ color: '#b45309' }}>
                  Guest Session Security
                </span>
                <h3>Expire All Active Guest Sessions?</h3>
                <p>
                  This will immediately revoke all{' '}
                  <strong>{dashboard?.guest_activity?.active_sessions ?? 0}</strong> active guest
                  recognition session(s) for <strong>{activeEvent?.name}</strong>. Guests will need
                  to re-confirm consent and submit a new selfie to preview photographs.
                </p>
                <div className="admin-rec-modal__actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmedRevokeGuestSessions}
                  >
                    Confirm Session Revocation
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="admin-rec__eyebrow">Full Event Re-Index</span>
                <h3>Re-Index All {totalPhotos} Photographs?</h3>
                <p>
                  This will re-run face detection and regenerate embeddings across all{' '}
                  <strong>{totalPhotos}</strong> photographs in <strong>{activeEvent?.name}</strong>
                  , replacing existing face vectors without creating duplicates.
                </p>
                <div className="admin-rec-modal__actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleStartIndexing('reindex_all')}
                  >
                    Start Full Re-Index
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminRecognition

