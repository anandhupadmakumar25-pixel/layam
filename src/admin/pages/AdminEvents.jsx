import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EventTable from '../components/EventTable.jsx'
import LiveEventHubModal from '../components/LiveEventHubModal.jsx'
import LocationPickerModal from '../components/LocationPickerModal.jsx'
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
  uploadCoverImageToCloud,
} from '../../services/api.js'
import './AdminEvents.css'

const getTodayDateString = () => new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  name: '',
  description: '',
  event_date: getTodayDateString(),
  location: '',
  category: 'Weddings',
  cover_image: '',
  photo_count: 0,
  status: 'Active',
}

function AdminEvents() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const [formOpen, setFormOpen] = useState(() => searchParams.get('action') === 'new')
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [feedbackBanner, setFeedbackBanner] = useState('')

  const [viewingEvent, setViewingEvent] = useState(null)
  const [liveHubEvent, setLiveHubEvent] = useState(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [gpsLocating, setGpsLocating] = useState(false)

  // Cover Image Cloud Upload State
  const coverFileInputRef = useRef(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverUploadProgress, setCoverUploadProgress] = useState(0)
  const [coverUploadStatus, setCoverUploadStatus] = useState('')
  const [coverDragOver, setCoverDragOver] = useState(false)

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await fetchEvents()
      setEvents(Array.isArray(data) ? data : [])
    } catch (err) {
      setApiError(err.message || 'Failed to load events from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const openCreateForm = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setApiError('')
    setFieldErrors({})
    setFormOpen(true)
  }

  const openEditForm = (event) => {
    setEditingId(event.id)
    setFormData({
      name: event.name || '',
      description: event.description || '',
      event_date: event.event_date || '',
      location: event.location || '',
      category: event.category || 'Weddings',
      cover_image: event.cover_image || '',
      photo_count: event.photo_count ?? 0,
      status: event.status || 'Upcoming',
    })
    setApiError('')
    setFieldErrors({})
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setApiError('')
    setFieldErrors({})
    setCoverUploading(false)
    setCoverUploadProgress(0)
    setCoverUploadStatus('')
    if (searchParams.has('action')) {
      setSearchParams({})
    }
  }

  const handleCoverFileSelect = async (file) => {
    if (!file) return
    if (!file.type || !file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({
        ...prev,
        cover_image: 'Please select a valid image file (JPG, PNG, or WEBP).',
      }))
      return
    }

    setFieldErrors((prev) => ({ ...prev, cover_image: '' }))
    setCoverUploading(true)
    setCoverUploadProgress(10)
    setCoverUploadStatus('Uploading image to cloud...')

    try {
      const uploadedUrl = await uploadCoverImageToCloud(file, (pct) => {
        setCoverUploadProgress(pct)
      })
      setFormData((prev) => ({ ...prev, cover_image: uploadedUrl }))
      setCoverUploadStatus('✓ Uploaded to cloud & URL loaded')
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        cover_image: err.message || 'Failed to upload cover image to cloud.',
      }))
      setCoverUploadStatus('')
    } finally {
      setCoverUploading(false)
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = ''
      }
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'photo_count' ? Math.max(0, Number(value) || 0) : value,
    }))
  }

  const handleDirectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGpsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          if (!res.ok) throw new Error('Geocoding unavailable')
          const data = await res.json()
          const addr = data.address || {}
          const venue = addr.amenity || addr.building || addr.tourism || addr.hotel || ''
          const road = addr.road || addr.suburb || ''
          const city = addr.city || addr.town || addr.village || addr.county || ''
          const country = addr.country || ''
          const parts = [venue, road, city, country].filter(Boolean)
          const loc = [...new Set(parts)].slice(0, 3).join(', ') || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          setFormData((prev) => ({ ...prev, location: loc.slice(0, 190) }))
        } catch {
          setFormData((prev) => ({
            ...prev,
            location: `Coordinates (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          }))
        } finally {
          setGpsLocating(false)
        }
      },
      (err) => {
        setGpsLocating(false)
        alert('Could not detect GPS coordinates. Click "Pick from Map" to choose your location.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setFieldErrors({})
    setFeedbackBanner('')
    setSubmitting(true)

    try {
      if (editingId) {
        const updated = await updateEvent(editingId, formData)
        setEvents((prev) => prev.map((ev) => (ev.id === editingId ? updated : ev)))
        setFeedbackBanner(`Updated event "${updated.name}" in database.`)
      } else {
        const created = await createEvent(formData)
        setEvents((prev) => [created, ...prev])
        setFeedbackBanner(`Created "${created.name}". Live QR pass generated and AI face indexing initialized!`)
        closeForm()
        setLiveHubEvent(created)
        return
      }
      closeForm()
    } catch (err) {
      setApiError(err.message || 'Please review the highlighted form fields.')
      if (err.fieldErrors && typeof err.fieldErrors === 'object') {
        setFieldErrors(err.fieldErrors)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (event) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${event.name}"?`
    )
    if (!confirmed) return

    setFeedbackBanner('')
    setApiError('')
    try {
      await deleteEvent(event.id)
      setEvents((prev) => prev.filter((item) => item.id !== event.id))
      setFeedbackBanner(`Deleted event "${event.name}".`)
      if (viewingEvent?.id === event.id) {
        setViewingEvent(null)
      }
    } catch (err) {
      setApiError(err.message || 'Unable to delete event.')
    }
  }

  const filteredEvents = events.filter((ev) => {
    const matchesStatus = statusFilter === 'All' || ev.status === statusFilter
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      ev.name.toLowerCase().includes(q) ||
      ev.location.toLowerCase().includes(q) ||
      ev.category.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const renderFieldError = (field) => {
    const msg = fieldErrors[field]
    if (!msg) return null
    return (
      <span className="admin-form-field__error">
        {Array.isArray(msg) ? msg[0] : String(msg)}
      </span>
    )
  }

  return (
    <div className="admin-events-page">
      {/* Top Toolbar */}
      <div className="admin-events__toolbar">
        <div>
          <span className="admin-events__eyebrow">Live Station Management</span>
          <h2 className="admin-events__heading">Studio Event Archives ({events.length})</h2>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (formOpen ? closeForm() : openCreateForm())}
        >
          {formOpen ? 'Close Form' : '+ Quick Event & Live Station'}
        </button>
      </div>

      {feedbackBanner && (
        <div className="admin-events__feedback" role="status">
          <span>{feedbackBanner}</span>
          <button type="button" onClick={() => setFeedbackBanner('')}>
            &times;
          </button>
        </div>
      )}

      {apiError && !formOpen && (
        <div className="admin-events__error" role="alert">
          {apiError}
        </div>
      )}

      {/* Add / Edit Event Form */}
      {formOpen && (
        <section className="admin-event-form-card fade-up">
          <div className="admin-event-form-card__head">
            <div>
              <span className="admin-events__eyebrow">
                {editingId ? 'Update Existing Record' : 'New Commission Dossier'}
              </span>
              <h3>{editingId ? 'Edit Studio Event' : 'Add New Studio Event'}</h3>
            </div>
            <button type="button" className="admin-event-form-card__close" onClick={closeForm}>
              Cancel
            </button>
          </div>

          {apiError && (
            <div className="admin-events__error" role="alert">
              {apiError}
            </div>
          )}

          <form className="admin-event-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-event-form__grid">
              <div className="admin-form-field">
                <label htmlFor="ev-name">Event Name *</label>
                <input
                  id="ev-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. The Laurent & Vance Lake Como Soirée"
                  value={formData.name}
                  onChange={handleChange}
                />
                {renderFieldError('name')}
              </div>

              <div className="admin-form-field">
                <label htmlFor="ev-date">Event Date *</label>
                <input
                  id="ev-date"
                  name="event_date"
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={handleChange}
                />
                {renderFieldError('event_date')}
              </div>

              <div className="admin-form-field">
                <div className="admin-form-field__label-row">
                  <label htmlFor="ev-location">Event Location *</label>
                  <div className="admin-form-field__actions">
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={handleDirectCurrentLocation}
                      disabled={gpsLocating}
                      title="Auto-detect current GPS coordinates"
                    >
                      {gpsLocating ? '📍 Detecting GPS...' : '📍 Use Current Location'}
                    </button>
                    <button
                      type="button"
                      className="btn-text-action btn-text-action--gold"
                      onClick={() => setLocationPickerOpen(true)}
                      title="Open interactive map to search or pin location"
                    >
                      🗺️ Pick from Map
                    </button>
                  </div>
                </div>
                <div className="admin-form-field__input-with-tools">
                  <input
                    id="ev-location"
                    name="location"
                    type="text"
                    required
                    placeholder="e.g. Villa Balbiano, Lake Como or use map"
                    value={formData.location}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="admin-input-map-btn"
                    onClick={() => setLocationPickerOpen(true)}
                    title="Open interactive map picker"
                  >
                    🗺️ Map
                  </button>
                </div>
                {renderFieldError('location')}
              </div>

              <div className="admin-form-field">
                <label htmlFor="ev-category">Event Category *</label>
                <select
                  id="ev-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="Weddings">Weddings (Matrimony &amp; Celebration)</option>
                  <option value="Galas">Corporate Events &amp; Galas</option>
                  <option value="Brand">Brand Concept Shoots</option>
                  <option value="Portraits">Moments &amp; Celebrations (Portraits)</option>
                  <option value="Editorial">Editorial</option>
                </select>
                {renderFieldError('category')}
              </div>

              <div className="admin-form-field">
                <label htmlFor="ev-status">Event Status *</label>
                <select
                  id="ev-status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                  <option value="Draft">Draft</option>
                </select>
                {renderFieldError('status')}
              </div>

              <div className="admin-form-field">
                <label htmlFor="ev-photos">Cataloged Photographs</label>
                <input
                  id="ev-photos"
                  name="photo_count"
                  type="number"
                  min="0"
                  value={formData.photo_count}
                  onChange={handleChange}
                />
                {renderFieldError('photo_count')}
              </div>
            </div>

            <div className="admin-form-field">
              <div className="admin-form-field__label-row">
                <label htmlFor="ev-cover">Event Cover Image (Upload to Cloud or Paste URL)</label>
                <div className="admin-form-field__actions">
                  {coverUploadStatus && !coverUploading && (
                    <span className="admin-cover-upload__badge">{coverUploadStatus}</span>
                  )}
                  <button
                    type="button"
                    className="btn-text-action btn-text-action--gold"
                    disabled={coverUploading}
                    onClick={() => coverFileInputRef.current?.click()}
                  >
                    {coverUploading
                      ? `☁️ Uploading (${coverUploadProgress}%)...`
                      : '☁️ Upload Image from Device'}
                  </button>
                  {formData.cover_image && (
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, cover_image: '' }))
                        setCoverUploadStatus('')
                      }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCoverFileSelect(file)
                }}
              />

              <div
                className={`admin-cover-upload-zone ${coverDragOver ? 'is-dragover' : ''} ${
                  coverUploading ? 'is-uploading' : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setCoverDragOver(true)
                }}
                onDragLeave={() => setCoverDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setCoverDragOver(false)
                  const file = e.dataTransfer?.files?.[0]
                  if (file) handleCoverFileSelect(file)
                }}
              >
                <div className="admin-cover-upload-zone__controls">
                  <div className="admin-form-field__input-with-tools admin-cover-upload-zone__input-wrap">
                    <input
                      id="ev-cover"
                      name="cover_image"
                      type="url"
                      placeholder="Upload an image to auto-fill cloud URL, or paste https://... URL"
                      value={formData.cover_image}
                      onChange={(e) => {
                        setCoverUploadStatus('')
                        handleChange(e)
                      }}
                    />
                    <button
                      type="button"
                      className="admin-input-map-btn"
                      disabled={coverUploading}
                      onClick={() => coverFileInputRef.current?.click()}
                      title="Select cover photo from device to instantly upload to cloud"
                    >
                      {coverUploading ? `${coverUploadProgress}%` : '☁️ Upload'}
                    </button>
                  </div>

                  {coverUploading && (
                    <div className="admin-cover-upload__progress">
                      <div
                        className="admin-cover-upload__progress-bar"
                        style={{ width: `${coverUploadProgress}%` }}
                      />
                    </div>
                  )}

                  <span className="admin-cover-upload__hint">
                    Drag &amp; drop a cover photo here or click <strong>Upload</strong> — it will
                    instantly upload to the cloud and load the URL automatically.
                  </span>
                </div>

                {formData.cover_image && (
                  <div className="admin-cover-upload__preview">
                    <img
                      src={formData.cover_image}
                      alt="Event cover preview"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block'
                      }}
                    />
                  </div>
                )}
              </div>
              {renderFieldError('cover_image')}
            </div>

            <div className="admin-form-field">
              <label htmlFor="ev-desc">Event Description</label>
              <textarea
                id="ev-desc"
                name="description"
                rows="3"
                placeholder="Editorial notes, lighting setup, or schedule overview..."
                value={formData.description}
                onChange={handleChange}
              />
              {renderFieldError('description')}
            </div>

            <div className="admin-event-form__actions">
              <button type="button" className="btn btn-outline" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-gold" disabled={submitting}>
                {submitting
                  ? 'Saving to Database...'
                  : editingId
                    ? 'Save Event Changes'
                    : '⚡ Create & Launch Live Station'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Search & Status Filters */}
      <div className="admin-events__filters">
        <input
          type="search"
          className="admin-events__search"
          placeholder="Search events by name, location, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="admin-events__status-tabs">
          {['All', 'Active', 'Upcoming', 'Archived', 'Draft'].map((st) => (
            <button
              key={st}
              type="button"
              className={`admin-events__tab ${statusFilter === st ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Event Listing Table */}
      {loading ? (
        <div className="admin-event-empty">
          <p>Loading studio events from Django API...</p>
        </div>
      ) : (
        <EventTable
          events={filteredEvents}
          onOpenLiveHub={(ev) => setLiveHubEvent(ev)}
          onView={setViewingEvent}
          onEdit={openEditForm}
          onDelete={handleDelete}
        />
      )}

      {/* Event Detail Modal (View Action) */}
      {viewingEvent && (
        <div className="admin-event-modal" role="dialog" aria-modal="true">
          <div className="admin-event-modal__backdrop" onClick={() => setViewingEvent(null)} />
          <div className="admin-event-modal__dialog">
            <div className="admin-event-modal__media">
              <img src={viewingEvent.cover_image} alt={viewingEvent.name} />
              <span
                className={`admin-event-status status--${(
                  viewingEvent.status || 'upcoming'
                ).toLowerCase()}`}
              >
                {viewingEvent.status}
              </span>
            </div>
            <div className="admin-event-modal__body">
              <span className="admin-events__eyebrow">
                {viewingEvent.category} &bull; {viewingEvent.event_date}
              </span>
              <h3>{viewingEvent.name}</h3>
              <p className="admin-event-modal__loc">{viewingEvent.location}</p>
              <p className="admin-event-modal__desc">
                {viewingEvent.description || 'No additional description recorded for this event.'}
              </p>
              <div className="admin-event-modal__meta">
                <div>
                  <strong>{viewingEvent.photo_count}</strong>
                  <span>Photographs</span>
                </div>
                <div>
                  <strong>/{viewingEvent.slug}</strong>
                  <span>Archive Slug</span>
                </div>
              </div>
              <div className="admin-event-modal__actions">
                <Link
                  to={`/admin/gallery?event=${viewingEvent.id}`}
                  className="btn btn-gold"
                >
                  Manage Photos ({viewingEvent.photo_count ?? 0})
                </Link>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    const ev = viewingEvent
                    setViewingEvent(null)
                    openEditForm(ev)
                  }}
                >
                  Edit Event
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setViewingEvent(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Station Hub Modal (One-Click QR & Live Photo Dropzone) */}
      {liveHubEvent && (
        <LiveEventHubModal
          event={liveHubEvent}
          onClose={() => setLiveHubEvent(null)}
          onEventUpdated={(count) => {
            if (typeof count === 'number' && liveHubEvent) {
              setEvents((prev) =>
                prev.map((ev) => (ev.id === liveHubEvent.id ? { ...ev, photo_count: count } : ev))
              )
              setLiveHubEvent((prev) => (prev ? { ...prev, photo_count: count } : null))
            }
          }}
        />
      )}

      {/* Interactive Map & Geolocation Location Picker Modal */}
      <LocationPickerModal
        isOpen={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initialLocation={formData.location}
        onSelectLocation={(pickedLocation) => {
          setFormData((prev) => ({ ...prev, location: pickedLocation }))
        }}
      />
    </div>
  )
}

export default AdminEvents

