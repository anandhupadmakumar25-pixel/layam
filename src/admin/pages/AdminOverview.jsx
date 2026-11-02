import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import StatCard from '../components/StatCard.jsx'
import { formatBytes } from '../components/PhotoUploader.jsx'
import { fetchDashboardStats } from '../../services/api.js'
import './AdminOverview.css'

const SAMPLE_GUEST_ACTIVITY = [
  {
    id: 'ga-1',
    guest: 'VIP Guest #084 (Selfie Match)',
    event: 'The Laurent & Vance Lake Como Soirée',
    action: 'Matched 19 portraits & downloaded high-res ZIP',
    time: '12 mins ago',
  },
  {
    id: 'ga-2',
    guest: 'Press Desk — Vogue Italia',
    event: 'Maison Verlaine Resort Collection Presentation',
    action: 'Accessed curated press select deck (42 frames)',
    time: '1 hour ago',
  },
  {
    id: 'ga-3',
    guest: 'Patron Table 04 QR Scan',
    event: 'Autumn Patron Gala at The Glass Pavilion',
    action: 'Opened private mobile event gallery via table QR',
    time: '3 hours ago',
  },
]

function AdminOverview() {
  const { hasPermission } = useAuth()
  const [stats, setStats] = useState({
    total_events: 0,
    total_photographs: 0,
    active_galleries: 0,
    recent_events: [],
    recent_photos: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchDashboardStats()
      .then((data) => {
        if (active) {
          setStats({
            total_events: data.total_events || 0,
            total_photographs: data.total_photographs || 0,
            active_galleries: data.active_galleries || 0,
            recent_events: data.recent_events || [],
            recent_photos: data.recent_photos || [],
          })
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load live dashboard statistics.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="admin-overview">
      {/* Data Source Notice Banner */}
      <div className="admin-overview__notice">
        <div>
          <span className="admin-overview__notice-tag">Data Transparency</span>
          <span>
            <strong>Total Events</strong>, <strong>Total Photographs</strong>,{' '}
            <strong>Active Galleries</strong>, <strong>Recent Events</strong>, and{' '}
            <strong>Recently Uploaded Photographs</strong> are fetched live from the Django SQLite
            API. Guest telemetry displays structured <em>Sample Previews</em> ahead of Phase 5.
          </span>
        </div>
      </div>

      {error && <div className="admin-overview__error">{error}</div>}

      {/* 1. Statistic Cards */}
      <section className="admin-overview__stats-grid" aria-label="Studio Statistics">
        <StatCard
          label="Total Events"
          value={loading ? '...' : stats.total_events}
          subtitle="Synchronized with Django Event model"
          source="live"
        />
        <StatCard
          label="Total Photographs"
          value={loading ? '...' : stats.total_photographs.toLocaleString()}
          subtitle="Actual uploaded Photo rows in database"
          source="live"
        />
        <StatCard
          label="Active Galleries"
          value={loading ? '...' : stats.active_galleries}
          subtitle="Events currently marked Active"
          source="live"
        />
        <StatCard
          label="Total Guest Accesses"
          value="3,480"
          subtitle="Sample metric (Guest portal in Phase 5)"
          source="sample"
        />
      </section>

      {/* 2. Quick Action Buttons */}
      <section className="admin-overview__quick-actions">
        <div className="admin-section-head">
          <h2>Quick Actions</h2>
          <span className="admin-badge admin-badge--live">Studio Shortcuts</span>
        </div>
        <div className="admin-overview__action-buttons">
          <Link to="/admin/events?action=new" className="btn btn-primary">
            + Create New Event
          </Link>
          <Link to="/admin/gallery" className="btn btn-gold">
            Upload Event Photographs
          </Link>
          <Link to="/admin/events" className="btn btn-outline">
            Manage Event Archives
          </Link>
          <Link to="/admin/qr-codes" className="btn btn-outline">
            Event QR Codes
          </Link>
          <Link to="/events" className="btn btn-outline">
            View Public Events Page
          </Link>
        </div>
      </section>

      {/* 3. Main Split Grid: Recent Events (Live) & Recent Guest Activity (Sample) */}
      <div className="admin-overview__split">
        {/* Recent Events (Live Backend Data) */}
        <section className="admin-panel">
          <div className="admin-section-head">
            <div>
              <h2>Recent Events</h2>
              <p>Latest records from Django REST API (`/api/events/stats/`)</p>
            </div>
            <span className="admin-badge admin-badge--live">Live Backend Data</span>
          </div>

          {loading ? (
            <p className="admin-panel__empty">Loading recent events from database...</p>
          ) : stats.recent_events.length === 0 ? (
            <p className="admin-panel__empty">
              No events in database yet.{' '}
              <Link to="/admin/events">Create your first event &rarr;</Link>
            </p>
          ) : (
            <ul className="admin-recent-events">
              {stats.recent_events.map((ev) => (
                <li key={ev.id} className="admin-recent-events__item">
                  <img
                    src={ev.cover_image}
                    alt={ev.name}
                    className="admin-recent-events__thumb"
                  />
                  <div className="admin-recent-events__info">
                    <strong>{ev.name}</strong>
                    <span>
                      {ev.event_date} &bull; {ev.location} &bull; {ev.category}
                    </span>
                  </div>
                  <div className="admin-recent-events__meta">
                    <span
                      className={`admin-event-status status--${(
                        ev.status || 'upcoming'
                      ).toLowerCase()}`}
                    >
                      {ev.status}
                    </span>
                    <Link
                      to={`/admin/gallery?event=${ev.id}`}
                      style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', fontWeight: 600 }}
                    >
                      {ev.photo_count} frames &rarr;
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="admin-panel__footer">
            {hasPermission('events') ? (
              <Link to="/admin/events" className="admin-panel__link">
                Open Full Event Manager &rarr;
              </Link>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#999999' }}>Event Manager (Restricted)</span>
            )}
          </div>
        </section>

        {/* Recent Guest Activity (Sample Data) */}
        <section className="admin-panel">
          <div className="admin-section-head">
            <div>
              <h2>Recent Guest Activity</h2>
              <p>Preview of guest QR scans and AI face-discovery sessions</p>
            </div>
            <span className="admin-badge admin-badge--sample">Sample Data</span>
          </div>

          <ul className="admin-activity-list">
            {SAMPLE_GUEST_ACTIVITY.map((item) => (
              <li key={item.id} className="admin-activity-list__item">
                <div className="admin-activity-list__top">
                  <strong>{item.guest}</strong>
                  <time>{item.time}</time>
                </div>
                <p>{item.action}</p>
                <span className="admin-activity-list__event">{item.event}</span>
              </li>
            ))}
          </ul>

          <div className="admin-panel__footer">
            {hasPermission('guest_activity') ? (
              <Link to="/admin/guest-activity" className="admin-panel__link">
                View Guest Telemetry Module &rarr;
              </Link>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#999999' }}>Guest Telemetry (Restricted)</span>
            )}
          </div>
        </section>
      </div>

      {/* 4. Recently Uploaded Photographs (Live Backend Data) */}
      <section className="admin-panel">
        <div className="admin-section-head">
          <div>
            <h2>Recently Uploaded Photographs</h2>
            <p>Latest frames ingested into the Django `Photo` model and media storage</p>
          </div>
          <span className="admin-badge admin-badge--live">Live Backend Data</span>
        </div>

        {loading ? (
          <p className="admin-panel__empty">Loading recent photographs...</p>
        ) : stats.recent_photos.length === 0 ? (
          <div className="admin-panel__empty">
            <p>
              No photographs uploaded yet.{' '}
              {hasPermission('gallery') && (
                <Link to="/admin/gallery" style={{ color: 'var(--gold-dark)', fontWeight: 600 }}>
                  Open the Photo Gallery Engine to upload your first batch &rarr;
                </Link>
              )}
            </p>
          </div>
        ) : (
          <div className="admin-photo-grid">
            {stats.recent_photos.map((photo) => (
              <figure key={photo.id} className="admin-photo-card">
                <div className="admin-photo-card__img-wrap">
                  <img
                    src={photo.thumbnail_url || photo.image_url}
                    alt={photo.original_filename}
                  />
                </div>
                <figcaption className="admin-photo-card__caption">
                  <strong>{photo.original_filename}</strong>
                  <span>{photo.event_name}</span>
                  <small>
                    {photo.image_width} &times; {photo.image_height} px &bull;{' '}
                    {formatBytes(photo.file_size)}
                  </small>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="admin-panel__footer">
          {hasPermission('gallery') ? (
            <Link to="/admin/gallery" className="admin-panel__link">
              Open Photo Gallery &amp; Batch Uploader &rarr;
            </Link>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#999999' }}>Photo Gallery (Restricted)</span>
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminOverview
