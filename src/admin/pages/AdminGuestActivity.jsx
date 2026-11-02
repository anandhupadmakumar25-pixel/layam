import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  downloadAdminEventActivityCsv,
  downloadAdminEventDownloadsCsv,
  downloadAdminEventEngagementPdf,
  fetchAdminEventActivityTimeline,
  fetchAdminGuestActivityLogs,
  fetchAdminGuestActivitySummary,
  fetchEvents,
} from '../../services/api'
import './AdminGuestActivity.css'

const POLL_INTERVAL_MS = 20000

const ACTIVITY_TYPE_OPTIONS = [
  { value: '', label: 'All Activity Types' },
  { value: 'qr_scan', label: 'QR Scan' },
  { value: 'gallery_visit', label: 'Gallery Visit' },
  { value: 'consent_submitted', label: 'Consent Submitted' },
  { value: 'selfie_submitted', label: 'Selfie Submitted' },
  { value: 'matching_started', label: 'AI Matching Started' },
  { value: 'matching_completed', label: 'AI Matching Completed' },
  { value: 'matching_failed', label: 'AI Matching Failed' },
  { value: 'individual_download', label: 'Individual Photo Download' },
  { value: 'zip_download', label: 'ZIP Archive Download' },
  { value: 'session_expired', label: 'Session Expired' },
  { value: 'session_revoked', label: 'Session Revoked' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'matched', label: 'Matched' },
  { value: 'no_match', label: 'No Match' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'rejected', label: 'Rejected / Blocked' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
]

function formatBytes(bytes) {
  const num = Number(bytes || 0)
  if (!num || num <= 0) return '0 B'
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB`
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getStatusBadgeClass(statusValue) {
  if (['success', 'accepted', 'completed'].includes(statusValue)) {
    return 'ga-status-badge ga-status-badge--ok'
  }
  if (statusValue === 'matched') {
    return 'ga-status-badge ga-status-badge--gold'
  }
  if (['no_match', 'declined', 'expired', 'revoked'].includes(statusValue)) {
    return 'ga-status-badge ga-status-badge--warn'
  }
  return 'ga-status-badge ga-status-badge--err'
}

function computePresetDates(preset) {
  const today = new Date()
  const formatIsoDate = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  if (preset === 'today') {
    const iso = formatIsoDate(today)
    return { startDate: iso, endDate: iso }
  }
  if (preset === '7d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return { startDate: formatIsoDate(start), endDate: formatIsoDate(today) }
  }
  if (preset === '30d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return { startDate: formatIsoDate(start), endDate: formatIsoDate(today) }
  }
  return { startDate: '', endDate: '' }
}

function AdminGuestActivity() {
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [reportEventId, setReportEventId] = useState('')
  const [datePreset, setDatePreset] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activityType, setActivityType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)

  const [summaryData, setSummaryData] = useState(null)
  const [logsData, setLogsData] = useState(null)
  const [timelineData, setTimelineData] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exportingType, setExportingType] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  )
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load Events List
  useEffect(() => {
    let active = true
    async function loadEvents() {
      try {
        const list = await fetchEvents()
        if (!active) return
        const items = Array.isArray(list) ? list : list?.results || []
        setEvents(items)
        if (items.length > 0) {
          setReportEventId(String(items[0].id))
        }
      } catch (err) {
        if (!active) return
        setErrorMessage(err.message || 'Unable to load events list.')
      }
    }
    loadEvents()
    return () => {
      active = false
    }
  }, [])

  // Keep reportEventId synchronized when a specific event filter is chosen
  useEffect(() => {
    if (selectedEventId && selectedEventId !== 'all') {
      setReportEventId(String(selectedEventId))
    } else if (!reportEventId && events.length > 0) {
      setReportEventId(String(events[0].id))
    }
  }, [selectedEventId, events, reportEventId])

  const activeReportEvent = useMemo(() => {
    const targetId =
      selectedEventId !== 'all' ? String(selectedEventId) : String(reportEventId)
    return events.find((ev) => String(ev.id) === targetId) || null
  }, [events, selectedEventId, reportEventId])

  const loadAnalyticsAndLogs = useCallback(
    async (silent = false) => {
      if (!silent) {
        setRefreshing(true)
      }
      try {
        const filterParams = {
          event_id: selectedEventId !== 'all' ? selectedEventId : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }
        const logParams = {
          ...filterParams,
          activity_type: activityType || undefined,
          status: statusFilter || undefined,
          page,
          page_size: pageSize,
        }

        const targetTimelineEventId =
          selectedEventId !== 'all' ? selectedEventId : reportEventId

        const [summaryRes, logsRes, timelineRes] = await Promise.all([
          fetchAdminGuestActivitySummary(filterParams),
          fetchAdminGuestActivityLogs(logParams),
          targetTimelineEventId
            ? fetchAdminEventActivityTimeline(targetTimelineEventId, {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
              }).catch(() => null)
            : Promise.resolve(null),
        ])

        if (!isMountedRef.current) return
        setSummaryData(summaryRes)
        setLogsData(logsRes)
        setTimelineData(timelineRes)
        setLastRefreshedAt(new Date())
        setErrorMessage('')
      } catch (err) {
        if (!isMountedRef.current) return
        if (!silent) {
          setErrorMessage(
            err.message || 'Failed to load guest activity and analytics telemetry.'
          )
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [
      selectedEventId,
      reportEventId,
      startDate,
      endDate,
      activityType,
      statusFilter,
      page,
      pageSize,
    ]
  )

  useEffect(() => {
    loadAnalyticsAndLogs(false)
  }, [loadAnalyticsAndLogs])

  // Visibility-aware 20-second near-real-time polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      setIsTabVisible(visible)
      if (visible) {
        loadAnalyticsAndLogs(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAnalyticsAndLogs(true)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [loadAnalyticsAndLogs])

  const handlePresetChange = (e) => {
    const preset = e.target.value
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') return
    const { startDate: s, endDate: end } = computePresetDates(preset)
    setStartDate(s)
    setEndDate(end)
  }

  const handleExport = async (exportKind) => {
    const targetId =
      selectedEventId !== 'all' ? selectedEventId : reportEventId
    if (!targetId) {
      setErrorMessage('Please select an event to export a report.')
      return
    }
    setExportingType(exportKind)
    setErrorMessage('')
    setFeedbackMessage('')
    try {
      const params = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        activity_type: exportKind === 'activity_csv' ? activityType || undefined : undefined,
        status: exportKind === 'activity_csv' ? statusFilter || undefined : undefined,
      }
      let result
      if (exportKind === 'activity_csv') {
        result = await downloadAdminEventActivityCsv(targetId, params)
        setFeedbackMessage(`Exported Activity Log CSV (${result.filename}).`)
      } else if (exportKind === 'downloads_csv') {
        result = await downloadAdminEventDownloadsCsv(targetId, params)
        setFeedbackMessage(`Exported Download Summary CSV (${result.filename}).`)
      } else if (exportKind === 'engagement_pdf') {
        result = await downloadAdminEventEngagementPdf(targetId, params)
        setFeedbackMessage(`Exported Event Engagement Report PDF (${result.filename}).`)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Export failed. Please try again.')
    } finally {
      if (isMountedRef.current) {
        setExportingType('')
      }
    }
  }

  const kpis = summaryData?.kpis || {}
  const recAnalytics = summaryData?.recognition_analytics || {}
  const dlAnalytics = summaryData?.download_analytics || {}
  const logItems = logsData?.results || []
  const pagination = logsData?.pagination || {
    page: 1,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_previous: false,
  }
  const dailyTimeline = timelineData?.timeline?.daily_timeline || []

  const maxDailyEngagement = useMemo(() => {
    if (!dailyTimeline.length) return 1
    return Math.max(
      1,
      ...dailyTimeline.map(
        (d) =>
          (d.qr_scans || 0) +
          (d.gallery_visits || 0) +
          (d.matching_attempts || 0) +
          (d.individual_downloads || 0) +
          (d.zip_downloads || 0)
      )
    )
  }, [dailyTimeline])

  return (
    <div className="admin-ga-page">
      {/* Top Header, Filters & Export Controls */}
      <div className="admin-ga__header-card">
        <div className="admin-ga__header-top">
          <div className="admin-ga__header-info">
            <span className="admin-ga__eyebrow">
              Phase 10 — Guest Activity, AI Recognition &amp; Event Reporting
            </span>
            <h2>Guest Activity &amp; Recognition Log</h2>
            <p className="admin-ga__subtitle">
              Unified privacy-first telemetry across QR scans, gallery visits, DPDP consent
              pathways, temporary AI selfie matching, and original photograph delivery.
            </p>
          </div>

          <div className="admin-ga__header-actions">
            <div
              className="admin-ga__live-indicator"
              title={
                isTabVisible
                  ? 'Auto-polling every 20 seconds while tab is visible'
                  : 'Polling paused while tab is hidden'
              }
            >
              <span
                className={`admin-ga__live-dot ${
                  isTabVisible ? '' : 'admin-ga__live-dot--paused'
                }`}
              />
              <span>
                {isTabVisible ? 'Live Polling (20s)' : 'Polling Paused'}
                {lastRefreshedAt
                  ? ` · ${lastRefreshedAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`
                  : ''}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => loadAnalyticsAndLogs(false)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="admin-ga__filters-grid">
          <div className="admin-ga__filter-field">
            <label htmlFor="ga-event-filter">Event Scope</label>
            <select
              id="ga-event-filter"
              className="admin-ga__select"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All Studio Events ({events.length})</option>
              {events.map((ev) => (
                <option key={ev.id} value={String(ev.id)}>
                  {ev.name} ({ev.event_date})
                </option>
              ))}
            </select>
          </div>

          <div className="admin-ga__filter-field">
            <label htmlFor="ga-date-preset">Date Range</label>
            <select
              id="ga-date-preset"
              className="admin-ga__select"
              value={datePreset}
              onChange={handlePresetChange}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <>
              <div className="admin-ga__filter-field">
                <label htmlFor="ga-start-date">Start Date</label>
                <input
                  id="ga-start-date"
                  type="date"
                  className="admin-ga__input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="admin-ga__filter-field">
                <label htmlFor="ga-end-date">End Date</label>
                <input
                  id="ga-end-date"
                  type="date"
                  className="admin-ga__input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </>
          )}

          <div className="admin-ga__filter-field">
            <label htmlFor="ga-activity-type">Activity Type</label>
            <select
              id="ga-activity-type"
              className="admin-ga__select"
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value)
                setPage(1)
              }}
            >
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-ga__filter-field">
            <label htmlFor="ga-status-filter">Outcome / Status</label>
            <select
              id="ga-status-filter"
              className="admin-ga__select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Event Report & Export Bar */}
        <div className="admin-ga__export-bar">
          <div className="admin-ga__export-info">
            {selectedEventId === 'all' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span>
                  <strong>Report Target Event:</strong>
                </span>
                <select
                  aria-label="Select event for report export"
                  className="admin-ga__select"
                  style={{ width: 'auto', minWidth: '240px', padding: '0.45rem 0.75rem' }}
                  value={reportEventId}
                  onChange={(e) => setReportEventId(e.target.value)}
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={String(ev.id)}>
                      {ev.name} ({ev.event_date})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span>
                <strong>Active Event Report Scope:</strong>{' '}
                {activeReportEvent
                  ? `${activeReportEvent.name} (${activeReportEvent.event_date})`
                  : `Event #${selectedEventId}`}
              </span>
            )}
          </div>

          <div className="admin-ga__export-buttons">
            <button
              type="button"
              className="btn btn-outline"
              disabled={!activeReportEvent || Boolean(exportingType)}
              onClick={() => handleExport('activity_csv')}
            >
              {exportingType === 'activity_csv'
                ? 'Exporting Activity CSV...'
                : 'Export Activity Log CSV'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              disabled={!activeReportEvent || Boolean(exportingType)}
              onClick={() => handleExport('downloads_csv')}
            >
              {exportingType === 'downloads_csv'
                ? 'Exporting Downloads CSV...'
                : 'Export Download Summary CSV'}
            </button>

            <button
              type="button"
              className="btn btn-gold"
              disabled={!activeReportEvent || Boolean(exportingType)}
              onClick={() => handleExport('engagement_pdf')}
            >
              {exportingType === 'engagement_pdf'
                ? 'Generating PDF Report...'
                : 'Export Event Engagement PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback & Error Alerts */}
      {feedbackMessage && (
        <div className="admin-ga__feedback">
          <span>{feedbackMessage}</span>
          <button type="button" onClick={() => setFeedbackMessage('')}>
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="admin-ga__error">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')}>
            &times;
          </button>
        </div>
      )}

      {/* Historical Tracking & Privacy Disclosure */}
      <div className="admin-ga__disclosure-banner">
        <strong>Privacy &amp; Historical Tracking Note:</strong>
        {summaryData?.historical_tracking_note ||
          'QR scan and gallery visit counts reflect activity recorded from Phase 10 activation onward (deduplicated within 15-second windows). Consent, AI matching, and download metrics include all persisted database audit records. Guest selfies, raw session tokens, facial embeddings, and similarity scores are never stored or exposed here.'}
      </div>

      {/* 10 KPI Summary Cards */}
      <div className="admin-ga__kpi-grid">
        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">1. Total QR Scans</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.total_qr_scans || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Deduplicated valid &amp; rejected scans
          </span>
        </div>

        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">2. Unique Guest Sessions</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.unique_guest_sessions || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Consented HttpOnly sessions created
          </span>
        </div>

        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">3. Gallery Visits</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.gallery_visits || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Guest portal &amp; matched gallery views
          </span>
        </div>

        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">4. Consent Accepted</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.consent_accepted || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Explicit biometric consent approvals
          </span>
        </div>

        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">5. Matching Attempts</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.matching_attempts || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            In-memory AI selfie evaluations
          </span>
        </div>

        <div className="admin-ga__kpi-card admin-ga__kpi-card--gold">
          <span className="admin-ga__kpi-label">6. Successful Matching Sessions</span>
          <span className="admin-ga__kpi-value">
            {loading
              ? '—'
              : Number(kpis.successful_matching_sessions || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Guest sessions with ≥1 matched photo
          </span>
        </div>

        <div className="admin-ga__kpi-card admin-ga__kpi-card--gold">
          <span className="admin-ga__kpi-label">7. Photos Delivered</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.photos_delivered || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Original frames delivered (single + ZIP)
          </span>
        </div>

        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">8. Individual Downloads</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.individual_downloads || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Single high-resolution photo downloads
          </span>
        </div>

        <div className="admin-ga__kpi-card">
          <span className="admin-ga__kpi-label">9. ZIP Downloads</span>
          <span className="admin-ga__kpi-value">
            {loading ? '—' : Number(kpis.zip_downloads || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Full matched gallery ZIP archives
          </span>
        </div>

        <div className="admin-ga__kpi-card admin-ga__kpi-card--alert">
          <span className="admin-ga__kpi-label">10. Failed or Blocked Activities</span>
          <span className="admin-ga__kpi-value">
            {loading
              ? '—'
              : Number(kpis.failed_or_blocked_activities || 0).toLocaleString()}
          </span>
          <span className="admin-ga__kpi-sub">
            Rejected QR, selfie, or download attempts
          </span>
        </div>
      </div>

      {/* Section 8: Chronological Activity Timeline & Audit Log */}
      <div className="admin-ga__panel">
        <div className="admin-ga__panel-header">
          <div>
            <h3>Activity Timeline &amp; Audit Log</h3>
            <p>
              Chronological audit trail of guest journey events. Session identifiers are
              anonymized (`SESS-XXXXX`) and never expose raw tokens or biometric data.
            </p>
          </div>
          <span className="admin-ga__session-ref">
            Total Matching Records: {Number(pagination.total_count || 0).toLocaleString()}
          </span>
        </div>

        {loading ? (
          <div className="admin-ga__empty">
            <strong>Loading Guest Activity Log...</strong>
            Retrieving chronological guest events from the database.
          </div>
        ) : logItems.length === 0 ? (
          <div className="admin-ga__empty">
            <strong>No Guest Activity Records Found</strong>
            No guest QR scans, consent submissions, selfie matches, or downloads match your
            current filters yet.
          </div>
        ) : (
          <>
            <div className="admin-ga__table-wrap">
              <table className="admin-ga__table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Name</th>
                    <th>Activity Type</th>
                    <th>Status</th>
                    <th>Safe Session Ref</th>
                    <th>Photos</th>
                    <th>Timing / Size</th>
                    <th>Safe Status / Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : '—'}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {item.event_name}
                        </strong>
                        {item.event_date ? (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {item.event_date}
                          </div>
                        ) : null}
                      </td>
                      <td>{item.activity_label}</td>
                      <td>
                        <span className={getStatusBadgeClass(item.status)}>
                          {item.status_label}
                        </span>
                      </td>
                      <td>
                        <span className="admin-ga__session-ref">
                          {item.safe_session_ref || 'ANON'}
                        </span>
                      </td>
                      <td>
                        {item.photo_count > 0 ? `${item.photo_count} photo(s)` : '0'}
                      </td>
                      <td>
                        {item.downloaded_bytes > 0
                          ? formatBytes(item.downloaded_bytes)
                          : item.processing_ms !== null &&
                            item.processing_ms !== undefined
                          ? `${item.processing_ms} ms`
                          : '—'}
                      </td>
                      <td>{item.detail_message || item.detail_code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-ga__pagination">
              <span>
                Showing page <strong>{pagination.page}</strong> of{' '}
                <strong>{pagination.total_pages}</strong> ({pagination.total_count}{' '}
                total activity record{pagination.total_count === 1 ? '' : 's'})
              </span>
              <div className="admin-ga__pagination-controls">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!pagination.has_previous}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous Page
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!pagination.has_next}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next Page
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sections 9 & 10: AI Recognition Analytics + Download Analytics */}
      <div className="admin-ga__analytics-row">
        {/* Section 9: Privacy-First AI Recognition Analytics */}
        <div className="admin-ga__panel">
          <div className="admin-ga__panel-header">
            <div>
              <h3>Privacy-First AI Recognition Analytics</h3>
              <p>
                Aggregate YuNet + SFace indexing and guest matching metrics without exposing
                embeddings, selfies, or similarity scores.
              </p>
            </div>
          </div>

          <div className="admin-ga__metrics-grid">
            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">Indexed Event Photos</span>
              <span className="admin-ga__metric-box-value">
                {Number(recAnalytics.indexed_photos_count || 0).toLocaleString()} /{' '}
                {Number(recAnalytics.total_event_photos || 0).toLocaleString()}
              </span>
              <span className="admin-ga__metric-box-sub">
                Failed indexing: {Number(recAnalytics.failed_photos_count || 0)}
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">Total Faces Indexed</span>
              <span className="admin-ga__metric-box-value">
                {Number(recAnalytics.total_faces_indexed || 0).toLocaleString()}
              </span>
              <span className="admin-ga__metric-box-sub">
                128-D SFace vectors in active index
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">
                Guest Consent (Accept vs Decline)
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(recAnalytics.consent_accepted_count || 0)} Accepted ·{' '}
                {Number(recAnalytics.consent_declined_count || 0)} Declined
              </span>
              <span className="admin-ga__metric-box-sub">
                Adult (18+): {Number(recAnalytics.adult_self_count || 0)} · Guardian
                Attested: {Number(recAnalytics.guardian_minor_count || 0)}
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">
                Guest Matching Attempts
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(recAnalytics.total_matching_attempts || 0).toLocaleString()}
              </span>
              <span className="admin-ga__metric-box-sub">
                Matched: {Number(recAnalytics.matched_attempts_count || 0)} · No Match:{' '}
                {Number(recAnalytics.no_match_attempts_count || 0)} · Rejected Selfie:{' '}
                {Number(recAnalytics.rejected_selfie_attempts_count || 0)}
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">
                Avg Matching Processing Time
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(recAnalytics.avg_matching_processing_ms || 0).toLocaleString()} ms
              </span>
              <span className="admin-ga__metric-box-sub">
                In-memory selfie detection + cosine match
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">
                Guest Session Lifecycle
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(recAnalytics.active_sessions_count || 0)} Active
              </span>
              <span className="admin-ga__metric-box-sub">
                Expired: {Number(recAnalytics.expired_sessions_count || 0)} · Revoked:{' '}
                {Number(recAnalytics.revoked_sessions_count || 0)} · Total:{' '}
                {Number(recAnalytics.total_sessions_count || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 10: Download Analytics */}
        <div className="admin-ga__panel">
          <div className="admin-ga__panel-header">
            <div>
              <h3>Guest Download Analytics</h3>
              <p>
                Original high-resolution photograph and ZIP archive delivery telemetry across
                authorized guest sessions.
              </p>
            </div>
          </div>

          <div className="admin-ga__metrics-grid">
            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">
                Individual Original Downloads
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(
                  dlAnalytics.completed_individual_downloads || 0
                ).toLocaleString()}
              </span>
              <span className="admin-ga__metric-box-sub">
                Single original image streams
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">
                ZIP Archive Downloads
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(dlAnalytics.completed_zip_downloads || 0).toLocaleString()}
              </span>
              <span className="admin-ga__metric-box-sub">
                Self-cleaning matched ZIP packages
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">Total Photos Delivered</span>
              <span className="admin-ga__metric-box-value">
                {Number(dlAnalytics.total_photos_delivered || 0).toLocaleString()}
              </span>
              <span className="admin-ga__metric-box-sub">
                Cumulative frames delivered to guests
              </span>
            </div>

            <div className="admin-ga__metric-box">
              <span className="admin-ga__metric-box-label">Total Downloaded Volume</span>
              <span className="admin-ga__metric-box-value">
                {formatBytes(dlAnalytics.total_downloaded_bytes || 0)}
              </span>
              <span className="admin-ga__metric-box-sub">
                Avg delivery time:{' '}
                {Number(dlAnalytics.avg_download_processing_ms || 0)} ms
              </span>
            </div>

            <div className="admin-ga__metric-box" style={{ gridColumn: '1 / -1' }}>
              <span className="admin-ga__metric-box-label">
                Failed, Unauthorized or Rate-Limited Download Attempts
              </span>
              <span className="admin-ga__metric-box-value">
                {Number(dlAnalytics.failed_or_blocked_downloads || 0).toLocaleString()}{' '}
                Blocked / Failed
              </span>
              <span className="admin-ga__metric-box-sub">
                Unauthorized / Preview Token Rejected:{' '}
                {Number(dlAnalytics.rejected_unauthorized_downloads || 0)} · Limit / Size
                Exceeded: {Number(dlAnalytics.rejected_limit_downloads || 0)} · Storage
                Errors: {Number(dlAnalytics.error_downloads || 0)}
              </span>
            </div>
          </div>

          {/* Most Active Events by Download Count */}
          <div className="admin-ga__sub-section">
            <h4>Most Active Events by Download Count</h4>
            {Array.isArray(dlAnalytics.most_active_events_by_downloads) &&
            dlAnalytics.most_active_events_by_downloads.length > 0 ? (
              <div className="admin-ga__table-wrap">
                <table className="admin-ga__table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Completed Downloads</th>
                      <th>Single / ZIP</th>
                      <th>Photos Delivered</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dlAnalytics.most_active_events_by_downloads.map((evRow) => (
                      <tr key={evRow.event_id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {evRow.event_name}
                          </strong>
                        </td>
                        <td>{evRow.completed_downloads}</td>
                        <td>
                          {evRow.individual_downloads} single / {evRow.zip_downloads} ZIP
                        </td>
                        <td>{evRow.photos_delivered}</td>
                        <td>{formatBytes(evRow.downloaded_bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-ga__empty" style={{ padding: '1rem' }}>
                No completed guest downloads recorded in the selected scope yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 11: Event Engagement Report & Daily Timeline */}
      <div className="admin-ga__panel">
        <div className="admin-ga__panel-header">
          <div>
            <h3>
              Event Engagement Report &amp; Daily Timeline
              {activeReportEvent ? ` — ${activeReportEvent.name}` : ''}
            </h3>
            <p>
              Day-by-day guest engagement breakdown and print-ready host report generation for{' '}
              {activeReportEvent
                ? `${activeReportEvent.name} (${activeReportEvent.event_date} · ${activeReportEvent.location})`
                : 'the selected event'}
              .
            </p>
          </div>
          <div className="admin-ga__export-buttons">
            <button
              type="button"
              className="btn btn-outline"
              disabled={!activeReportEvent || Boolean(exportingType)}
              onClick={() => handleExport('activity_csv')}
            >
              Activity CSV
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={!activeReportEvent || Boolean(exportingType)}
              onClick={() => handleExport('downloads_csv')}
            >
              Downloads CSV
            </button>
            <button
              type="button"
              className="btn btn-gold"
              disabled={!activeReportEvent || Boolean(exportingType)}
              onClick={() => handleExport('engagement_pdf')}
            >
              Download Host PDF Report
            </button>
          </div>
        </div>

        {dailyTimeline.length === 0 ? (
          <div className="admin-ga__empty">
            <strong>No Daily Engagement Timeline Data Yet</strong>
            Once guests scan the event QR code, submit consent, match selfies, or download
            photographs, their daily engagement progression will appear here.
          </div>
        ) : (
          <div className="admin-ga__table-wrap">
            <table className="admin-ga__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>QR Scans</th>
                  <th>Gallery Visits</th>
                  <th>Consents (Accept / Decline)</th>
                  <th>Matching (Matched / Total)</th>
                  <th>Downloads (Single / ZIP)</th>
                  <th>Photos Delivered</th>
                  <th>Engagement Volume</th>
                </tr>
              </thead>
              <tbody>
                {dailyTimeline.map((dayRow) => {
                  const totalOps =
                    (dayRow.qr_scans || 0) +
                    (dayRow.gallery_visits || 0) +
                    (dayRow.matching_attempts || 0) +
                    (dayRow.individual_downloads || 0) +
                    (dayRow.zip_downloads || 0)
                  const pct = Math.min(
                    100,
                    Math.round((totalOps / maxDailyEngagement) * 100)
                  )
                  return (
                    <tr key={dayRow.date}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {dayRow.date}
                        </strong>
                      </td>
                      <td>{dayRow.qr_scans}</td>
                      <td>{dayRow.gallery_visits}</td>
                      <td>
                        {dayRow.consents_accepted} accepted / {dayRow.consents_declined}{' '}
                        declined
                      </td>
                      <td>
                        {dayRow.matched_sessions} matched / {dayRow.matching_attempts}{' '}
                        attempts
                      </td>
                      <td>
                        {dayRow.individual_downloads} single / {dayRow.zip_downloads} ZIP
                      </td>
                      <td>{dayRow.photos_delivered}</td>
                      <td>
                        <div className="admin-ga__timeline-bar-track">
                          <div
                            className="admin-ga__timeline-bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminGuestActivity
