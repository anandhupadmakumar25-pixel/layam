import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  activateEventQr,
  deactivateEventQr,
  downloadEventQrFile,
  fetchEventQr,
  fetchEvents,
  generateEventQr,
  regenerateEventQr,
  updateEventQrExpiration,
} from '../../services/api.js'
import './AdminQrCodes.css'

function formatTimestamp(isoString) {
  if (!isoString) return 'Not generated yet'
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) return isoString
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatQrStatusLabel(qrStatus, isExpired) {
  if (isExpired || qrStatus === 'expired') return 'Expired'
  if (qrStatus === 'active') return 'Active'
  if (qrStatus === 'inactive') return 'Cancelled / Paused'
  return 'Not Generated'
}

function AdminQrCodes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState(() => {
    const param = searchParams.get('event')
    return param ? Number(param) : null
  })

  const [qrState, setQrState] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState('')
  const [feedback, setFeedback] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [customExpiryInput, setCustomExpiryInput] = useState('')

  // Confirmation modal state: null | 'regenerate' | 'deactivate'
  const [confirmDialog, setConfirmDialog] = useState(null)

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

  // Synchronize event list item QR metadata when QR state updates
  const syncEventQrMeta = useCallback((eventId, payload) => {
    const qrRecord = payload?.qr_code || null
    let nextStatus = 'not_generated'
    if (qrRecord) {
      if (qrRecord.is_expired) {
        nextStatus = 'expired'
      } else if (!qrRecord.is_active) {
        nextStatus = 'inactive'
      } else {
        nextStatus = 'active'
      }
    }
    const nextCreatedAt = qrRecord ? qrRecord.created_at : null
    const nextExpiresAt = qrRecord ? qrRecord.expires_at : null

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              qr_status: nextStatus,
              qr_created_at: nextCreatedAt,
              qr_expires_at: nextExpiresAt,
              qr_is_expired: qrRecord?.is_expired || false,
            }
          : ev
      )
    )
  }, [])

  // 2. Load QR details for selected event
  const loadEventQrDetails = useCallback(async () => {
    if (!selectedEventId) return
    setQrLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchEventQr(selectedEventId)
      setQrState(data)
      syncEventQrMeta(selectedEventId, data)
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load QR code details for this event.')
    } finally {
      setQrLoading(false)
    }
  }, [selectedEventId, syncEventQrMeta])

  useEffect(() => {
    loadEventQrDetails()
  }, [loadEventQrDetails])

  const handleSelectEvent = (eventId) => {
    const nextId = Number(eventId)
    setSelectedEventId(nextId)
    setFeedback('')
    setErrorMsg('')
    setCopiedUrl(false)
    setCustomExpiryInput('')
    setSearchParams({ event: String(nextId) })
  }

  const handleGenerateQr = async () => {
    if (!selectedEventId) return
    setActionBusy('generate')
    setFeedback('')
    setErrorMsg('')
    try {
      const data = await generateEventQr(selectedEventId)
      setQrState(data)
      syncEventQrMeta(selectedEventId, data)
      setFeedback(data.detail || 'Event QR code generated and activated.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate event QR code.')
    } finally {
      setActionBusy('')
    }
  }

  const handleConfirmedRegenerate = async () => {
    if (!selectedEventId) return
    setConfirmDialog(null)
    setActionBusy('regenerate')
    setFeedback('')
    setErrorMsg('')
    setCopiedUrl(false)
    try {
      const data = await regenerateEventQr(selectedEventId)
      setQrState(data)
      syncEventQrMeta(selectedEventId, data)
      setFeedback(
        data.detail ||
          'Event QR code regenerated. All previously printed QR codes for this event are now invalid.'
      )
    } catch (err) {
      setErrorMsg(err.message || 'Failed to regenerate event QR code.')
    } finally {
      setActionBusy('')
    }
  }

  const handleConfirmedDeactivate = async () => {
    if (!selectedEventId) return
    setConfirmDialog(null)
    setActionBusy('deactivate')
    setFeedback('')
    setErrorMsg('')
    try {
      const data = await deactivateEventQr(selectedEventId)
      setQrState(data)
      syncEventQrMeta(selectedEventId, data)
      setFeedback(data.detail || 'Event QR code cancelled / paused. Guest scans are now blocked.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel / deactivate event QR code.')
    } finally {
      setActionBusy('')
    }
  }

  const handleActivateQr = async () => {
    if (!selectedEventId) return
    setActionBusy('activate')
    setFeedback('')
    setErrorMsg('')
    try {
      const data = await activateEventQr(selectedEventId)
      setQrState(data)
      syncEventQrMeta(selectedEventId, data)
      setFeedback(data.detail || 'Event QR code reactivated. Guests can scan normally.')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reactivate event QR code.')
    } finally {
      setActionBusy('')
    }
  }

  const handleUpdateExpiration = async (presetOrObj) => {
    if (!selectedEventId) return
    setActionBusy('expiration')
    setFeedback('')
    setErrorMsg('')
    try {
      const payload = typeof presetOrObj === 'string' ? { preset: presetOrObj } : presetOrObj
      const data = await updateEventQrExpiration(selectedEventId, payload)
      setQrState(data)
      syncEventQrMeta(selectedEventId, data)
      setFeedback(data.detail || 'Event QR pass expiration updated.')
      setCustomExpiryInput('')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update QR expiration.')
    } finally {
      setActionBusy('')
    }
  }

  const handleDownloadFile = async (fileFormat) => {
    if (!selectedEventId) return
    const activeEvent = events.find((ev) => ev.id === selectedEventId)
    setActionBusy(`download-${fileFormat}`)
    setFeedback('')
    setErrorMsg('')
    try {
      const filename = await downloadEventQrFile(
        selectedEventId,
        fileFormat,
        activeEvent?.slug || 'event'
      )
      setFeedback(`Downloaded print-ready ${fileFormat.toUpperCase()} placard (${filename}).`)
    } catch (err) {
      setErrorMsg(err.message || `Failed to download ${fileFormat.toUpperCase()} QR placard.`)
    } finally {
      setActionBusy('')
    }
  }

  const handleCopyGuestUrl = async () => {
    const guestUrl = qrState?.qr_code?.guest_url
    if (!guestUrl) return
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopiedUrl(true)
      setFeedback('Copied event guest entry URL to clipboard.')
      window.setTimeout(() => setCopiedUrl(false), 3000)
    } catch {
      setErrorMsg('Clipboard access was denied. Please copy the guest URL manually.')
    }
  }

  const activeEvent = events.find((ev) => ev.id === selectedEventId) || null
  const qrRecord = qrState?.qr_code || null
  const hasQr = Boolean(qrState?.has_qr && qrRecord)
  const isQrActive = Boolean(qrRecord?.is_active)
  const isQrExpired = Boolean(qrRecord?.is_expired)

  if (eventsLoading) {
    return (
      <div className="admin-qr-page">
        <div className="admin-qr-empty">
          <p>Loading studio events and cryptographic QR pass manager...</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="admin-qr-page">
        <div className="admin-qr-empty">
          <h3>No Studio Events Available</h3>
          <p>Create a photography event first before generating its guest QR access pass.</p>
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
    <div className="admin-qr-page">
      {/* 1. Event Selector Header + Event QR Directory */}
      <section className="admin-qr__selector-card">
        <div className="admin-qr__selector-info">
          <span className="admin-qr__eyebrow">Cryptographic Event Entry Passes</span>
          <h2>{activeEvent ? activeEvent.name : 'Select a Studio Event'}</h2>
          {activeEvent && (
            <p className="admin-qr__event-meta">
              {activeEvent.event_date} &bull; {activeEvent.location} &bull;{' '}
              <strong>{activeEvent.photo_count ?? 0}</strong> cataloged photographs
            </p>
          )}
        </div>

        <div className="admin-qr__selector-controls">
          <label htmlFor="qr-event-select">Select Studio Event</label>
          <select
            id="qr-event-select"
            value={selectedEventId || ''}
            onChange={(e) => handleSelectEvent(e.target.value)}
            className="admin-qr__select"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.event_date}) — {formatQrStatusLabel(ev.qr_status, ev.qr_is_expired)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Event Selector Directory Strip */}
      <section className="admin-qr__directory-card" aria-label="Event QR Code Status Directory">
        <div className="admin-qr__directory-head">
          <h3>Studio Events QR Overview</h3>
          <span>Select any event row below to inspect or manage its QR access pass, expiration, or cancellation</span>
        </div>
        <div className="admin-qr__directory-table-wrap">
          <table className="admin-qr__directory-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Event Date</th>
                <th>QR Status</th>
                <th>Expiration Date</th>
                <th>QR Creation Date</th>
                <th className="text-right">Select</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const isSelected = ev.id === selectedEventId
                const isExpired = Boolean(ev.qr_is_expired)
                let statusKey = ev.qr_status || 'not_generated'
                if (isExpired) statusKey = 'expired'

                return (
                  <tr
                    key={ev.id}
                    className={isSelected ? 'is-selected' : ''}
                    onClick={() => handleSelectEvent(ev.id)}
                  >
                    <td data-label="Event Name">
                      <strong>{ev.name}</strong>
                    </td>
                    <td data-label="Event Date">{ev.event_date}</td>
                    <td data-label="QR Status">
                      <span className={`admin-qr__status-badge qr-status--${statusKey}`}>
                        {formatQrStatusLabel(statusKey, isExpired)}
                      </span>
                    </td>
                    <td data-label="Expiration Date">
                      {ev.qr_expires_at ? (
                        <span style={{ color: isExpired ? '#dc2626' : 'inherit' }}>
                          {formatTimestamp(ev.qr_expires_at)}
                        </span>
                      ) : (
                        <span style={{ color: '#15803d', fontSize: '0.8rem' }}>Never expires</span>
                      )}
                    </td>
                    <td data-label="QR Creation Date">
                      {ev.qr_created_at ? formatTimestamp(ev.qr_created_at) : '—'}
                    </td>
                    <td data-label="Select" className="text-right">
                      <button
                        type="button"
                        className={`admin-action-btn ${isSelected ? 'admin-action-btn--gold' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectEvent(ev.id)
                        }}
                      >
                        {isSelected ? 'Selected' : 'Manage QR'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {feedback && (
        <div className="admin-qr__feedback" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')}>
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="admin-qr__error" role="alert">
          {errorMsg}
        </div>
      )}

      {/* 2. QR Code Workspace */}
      {qrLoading ? (
        <div className="admin-qr-empty">
          <p>Loading event QR code pass...</p>
        </div>
      ) : !hasQr ? (
        <section className="admin-qr__uninitialized-card fade-up">
          <span className="admin-qr__eyebrow">No Active QR Code Yet</span>
          <h3>Generate Event-Specific Guest QR Pass</h3>
          <p>
            <strong>{activeEvent?.name}</strong> does not have an initialized QR pass yet. Generating
            a pass creates a cryptographically secure random token (<code>secrets.token_urlsafe</code>
            ) and a 300 DPI print-ready placard that routes guests to the private onboarding page for
            this event.
          </p>
          <div className="admin-qr__uninitialized-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(actionBusy)}
              onClick={handleGenerateQr}
            >
              {actionBusy === 'generate' ? 'Generating QR Code...' : 'Generate QR Code'}
            </button>
          </div>
        </section>
      ) : (
        <div className="admin-qr__workspace fade-up">
          {/* Left Column: High-Contrast QR Preview Card */}
          <div className="admin-qr__preview-card">
            <div className="admin-qr__preview-header">
              <span className="admin-qr__eyebrow">Print-Ready Placard Preview</span>
              <span
                className={`admin-qr__status-badge ${
                  isQrExpired
                    ? 'qr-status--expired'
                    : isQrActive
                    ? 'qr-status--active'
                    : 'qr-status--inactive'
                }`}
              >
                {isQrExpired ? 'Expired Pass' : isQrActive ? 'Active Access' : 'Cancelled / Paused'}
              </span>
            </div>

            <div className="admin-qr__image-frame">
              {qrRecord.qr_image_url ? (
                <img
                  src={qrRecord.qr_image_url}
                  alt={`QR Code for ${activeEvent?.name || 'Studio Event'}`}
                  className="admin-qr__image"
                />
              ) : (
                <div className="admin-qr__image-fallback">
                  <p>QR preview image unavailable. Use Download PNG or Regenerate below.</p>
                </div>
              )}
            </div>

            <div className="admin-qr__download-bar">
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(actionBusy)}
                onClick={() => handleDownloadFile('png')}
              >
                {actionBusy === 'download-png' ? 'Preparing PNG...' : 'Download PNG (300 DPI)'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={Boolean(actionBusy)}
                onClick={() => handleDownloadFile('pdf')}
              >
                {actionBusy === 'download-pdf' ? 'Preparing PDF...' : 'Download PDF Placard'}
              </button>
            </div>
          </div>

          {/* Right Column: QR Details, Expiration Controls & Security Controls */}
          <div className="admin-qr__details-card">
            <div className="admin-qr__details-head">
              <span className="admin-qr__eyebrow">QR Pass Configuration &amp; Controls</span>
              <h3>{activeEvent?.name}</h3>
            </div>

            <dl className="admin-qr__meta-grid">
              <div className="admin-qr__meta-item">
                <dt>Event Name</dt>
                <dd>{activeEvent?.name}</dd>
              </div>
              <div className="admin-qr__meta-item">
                <dt>Access &amp; Expiration Status</dt>
                <dd>
                  <span
                    className={`admin-qr__status-badge ${
                      isQrExpired
                        ? 'qr-status--expired'
                        : isQrActive
                        ? 'qr-status--active'
                        : 'qr-status--inactive'
                    }`}
                  >
                    {isQrExpired
                      ? 'Expired Pass'
                      : isQrActive
                      ? 'Active — Accepting Scans'
                      : 'Cancelled / Paused'}
                  </span>
                </dd>
              </div>
              <div className="admin-qr__meta-item">
                <dt>Expiration Date</dt>
                <dd>
                  {qrRecord.expires_at ? (
                    <span style={{ color: isQrExpired ? '#dc2626' : 'inherit', fontWeight: 600 }}>
                      {formatTimestamp(qrRecord.expires_at)} {isQrExpired && '(Expired)'}
                    </span>
                  ) : (
                    <span style={{ color: '#15803d', fontWeight: 600 }}>No Expiration (Permanent)</span>
                  )}
                </dd>
              </div>
              <div className="admin-qr__meta-item">
                <dt>QR Creation Date</dt>
                <dd>{formatTimestamp(qrRecord.created_at)}</dd>
              </div>
              <div className="admin-qr__meta-item">
                <dt>Error Correction Level</dt>
                <dd>Level H (30% recovery tolerance)</dd>
              </div>
              <div className="admin-qr__meta-item">
                <dt>Previously Revoked Tokens</dt>
                <dd>{qrState?.revoked_count ?? 0} invalidated token(s)</dd>
              </div>
            </dl>

            {/* Expiration Controls Box */}
            <div className="admin-qr__expiration-box">
              <div className="admin-qr__expiration-header">
                <span className="admin-qr__expiration-title">
                  ⏳ QR Pass Expiration Control (Admin Decided)
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Current:{' '}
                  {qrRecord.expires_at ? formatTimestamp(qrRecord.expires_at) : 'Never Expires'}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Set an automatic expiration window after which guest QR scans will be stopped. You can
                extend or remove expiration at any time.
              </p>

              {/* Quick Presets */}
              <div className="admin-qr__presets-bar">
                <button
                  type="button"
                  className="admin-qr__preset-btn"
                  disabled={Boolean(actionBusy)}
                  onClick={() => handleUpdateExpiration('24h')}
                >
                  +24 Hours
                </button>
                <button
                  type="button"
                  className="admin-qr__preset-btn"
                  disabled={Boolean(actionBusy)}
                  onClick={() => handleUpdateExpiration('3d')}
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  className="admin-qr__preset-btn"
                  disabled={Boolean(actionBusy)}
                  onClick={() => handleUpdateExpiration('7d')}
                >
                  +7 Days (1 Week)
                </button>
                <button
                  type="button"
                  className="admin-qr__preset-btn"
                  disabled={Boolean(actionBusy)}
                  onClick={() => handleUpdateExpiration('30d')}
                >
                  +30 Days (1 Month)
                </button>
                <button
                  type="button"
                  className="admin-qr__preset-btn"
                  disabled={Boolean(actionBusy)}
                  onClick={() => handleUpdateExpiration('event_end')}
                  title="Expires at 11:59 PM of event date"
                >
                  Event Date End
                </button>
                <button
                  type="button"
                  className="admin-qr__preset-btn"
                  style={{ color: '#15803d', borderColor: '#bbf7d0' }}
                  disabled={Boolean(actionBusy)}
                  onClick={() => handleUpdateExpiration('never')}
                >
                  ♾️ Never Expire
                </button>
              </div>

              {/* Custom Date/Time input */}
              <div className="admin-qr__custom-expiry-row">
                <input
                  type="datetime-local"
                  className="admin-qr__datetime-input"
                  value={customExpiryInput}
                  onChange={(e) => setCustomExpiryInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={!customExpiryInput || Boolean(actionBusy)}
                  onClick={() =>
                    handleUpdateExpiration({
                      expires_at: new Date(customExpiryInput).toISOString(),
                    })
                  }
                >
                  Save Custom Expiration
                </button>
              </div>
            </div>

            {/* Guest Entry URL Box */}
            <div className="admin-qr__url-box">
              <label htmlFor="guest-entry-url-input">Guest Entry URL</label>
              <div className="admin-qr__url-row">
                <input
                  id="guest-entry-url-input"
                  type="text"
                  readOnly
                  value={qrRecord.guest_url || ''}
                  className="admin-qr__url-input"
                />
                <button
                  type="button"
                  className="btn btn-outline admin-qr__copy-btn"
                  onClick={handleCopyGuestUrl}
                >
                  {copiedUrl ? 'Copied!' : 'Copy Guest URL'}
                </button>
                <a
                  href={qrRecord.guest_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline admin-qr__open-btn"
                >
                  Preview Page &nearr;
                </a>
              </div>
              <span className="admin-qr__url-hint">
                Scanning the QR code opens this public guest portal route. No private photographs or
                internal database IDs are exposed through this link.
              </span>
            </div>

            {/* Security, Cancellation & Lifecycle Actions */}
            <div className="admin-qr__security-section">
              <h4>Pass Cancellation &amp; Token Lifecycle Controls</h4>
              <p>
                <strong>Cancelling/Deactivating</strong> instantly halts guest access without destroying
                your printed placard. <strong>Reactivating</strong> restores guest access.
                <strong> Regenerating</strong> permanently revokes the existing token and creates a brand-new QR pass.
              </p>

              <div className="admin-qr__action-buttons">
                {isQrActive ? (
                  <button
                    type="button"
                    className="btn btn-outline admin-qr__btn-warning"
                    disabled={Boolean(actionBusy)}
                    onClick={() => setConfirmDialog('deactivate')}
                  >
                    ⛔ Cancel / Pause QR Pass
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={Boolean(actionBusy)}
                    onClick={handleActivateQr}
                  >
                    {actionBusy === 'activate' ? 'Reactivating...' : '✓ Reactivate QR Pass'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-outline admin-qr__btn-danger"
                  disabled={Boolean(actionBusy)}
                  onClick={() => setConfirmDialog('regenerate')}
                >
                  {actionBusy === 'regenerate' ? 'Regenerating...' : '🔄 Revoke & Regenerate QR Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Regenerating or Cancelling/Deactivating */}
      {confirmDialog && (
        <div className="admin-qr-modal" role="dialog" aria-modal="true">
          <div
            className="admin-qr-modal__backdrop"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="admin-qr-modal__dialog fade-up">
            {confirmDialog === 'regenerate' ? (
              <>
                <span className="admin-qr__eyebrow" style={{ color: '#b91c1c' }}>
                  Permanent Token Rotation Warning
                </span>
                <h3>Regenerate Event QR Code?</h3>
                <p>
                  You are about to generate a new cryptographic QR token for{' '}
                  <strong>{activeEvent?.name}</strong>.
                </p>
                <div className="admin-qr-modal__warning-box">
                  <strong>Important:</strong> Regenerating this QR code will immediately and
                  permanently invalidate the current QR token. Any previously printed table cards,
                  placards, or shared links for this event will stop working.
                </div>
                <div className="admin-qr-modal__actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmDialog(null)}
                  >
                    Keep Current QR
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary admin-qr__btn-confirm-danger"
                    onClick={handleConfirmedRegenerate}
                  >
                    Yes, Invalidate Old QR &amp; Regenerate
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="admin-qr__eyebrow" style={{ color: '#b45309' }}>
                  Temporary Access Suspension
                </span>
                <h3>Cancel / Pause Event QR Pass?</h3>
                <p>
                  Cancelling the QR pass for <strong>{activeEvent?.name}</strong> will immediately
                  block guest scans and display a cancellation message.
                </p>
                <div className="admin-qr-modal__info-box">
                  Your printed physical QR placards will remain valid in the system and you can
                  reactivate them at any time with one click.
                </div>
                <div className="admin-qr-modal__actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmedDeactivate}
                  >
                    Confirm Cancellation
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

export default AdminQrCodes
