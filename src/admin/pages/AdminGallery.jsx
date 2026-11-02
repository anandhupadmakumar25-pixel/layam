import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PhotoUploader from '../components/PhotoUploader.jsx'
import PhotoGrid from '../components/PhotoGrid.jsx'
import PhotoLightboxModal from '../components/PhotoLightboxModal.jsx'
import {
  deletePhoto,
  fetchEventPhotos,
  fetchEvents,
} from '../../services/api.js'
import './AdminGallery.css'

const PAGE_SIZE = 24

function AdminGallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState(() => {
    const param = searchParams.get('event')
    return param ? Number(param) : null
  })

  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [totalEventPhotos, setTotalEventPhotos] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('-uploaded_at')

  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 1. Load Events list
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

  // 2. Load Photographs for selected Event
  const loadEventPhotos = useCallback(async () => {
    if (!selectedEventId) return
    setPhotosLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchEventPhotos(selectedEventId, {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery,
        ordering,
      })
      setPhotos(data.results || [])
      setTotalCount(data.count || 0)
      const eventTotal =
        typeof data.total_event_photos === 'number' ? data.total_event_photos : data.count || 0
      setTotalEventPhotos(eventTotal)

      // Keep local event dropdown count synchronized
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === selectedEventId ? { ...ev, photo_count: eventTotal } : ev
        )
      )
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load photographs for this event.')
    } finally {
      setPhotosLoading(false)
    }
  }, [selectedEventId, page, searchQuery, ordering])

  useEffect(() => {
    loadEventPhotos()
  }, [loadEventPhotos])

  const handleSelectEvent = (e) => {
    const nextId = Number(e.target.value)
    setSelectedEventId(nextId)
    setPage(1)
    setFeedback('')
    setSearchParams({ event: String(nextId) })
  }

  const handleUploadComplete = (result) => {
    setPage(1)
    loadEventPhotos()
    if (result?.uploaded_count > 0) {
      setFeedback(
        `Ingested ${result.uploaded_count} photograph${
          result.uploaded_count === 1 ? '' : 's'
        } into the event gallery.`
      )
    }
  }

  const handleDeletePhoto = async (photo) => {
    const confirmed = window.confirm(
      `Permanently delete photograph "${photo.original_filename}" and its stored files?`
    )
    if (!confirmed) return

    setFeedback('')
    setErrorMsg('')
    try {
      await deletePhoto(photo.id)
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null)
      }
      setFeedback(`Deleted photograph "${photo.original_filename}".`)
      loadEventPhotos()
    } catch (err) {
      setErrorMsg(err.message || 'Unable to delete photograph.')
    }
  }

  const activeEvent = events.find((ev) => ev.id === selectedEventId) || null
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  if (eventsLoading) {
    return (
      <div className="admin-gallery-page">
        <div className="photo-grid-empty">
          <p>Loading studio events and gallery engine...</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="admin-gallery-page">
        <div className="photo-grid-empty">
          <h3>No Studio Events Available</h3>
          <p>Create an event first before uploading photographs to its archive.</p>
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
    <div className="admin-gallery-page">
      {/* 1. Event Selector Bar */}
      <section className="admin-gallery__selector-card">
        <div className="admin-gallery__selector-info">
          <span className="admin-gallery__eyebrow">Active Event Archive</span>
          <h2>{activeEvent ? activeEvent.name : 'Select an Event'}</h2>
          {activeEvent && (
            <p className="admin-gallery__event-meta">
              {activeEvent.event_date} &bull; {activeEvent.location} &bull;{' '}
              <strong>{totalEventPhotos}</strong> cataloged photographs
            </p>
          )}
        </div>

        <div className="admin-gallery__selector-controls">
          <label htmlFor="gallery-event-select">Switch Studio Event</label>
          <select
            id="gallery-event-select"
            value={selectedEventId || ''}
            onChange={handleSelectEvent}
            className="admin-gallery__select"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.event_date}) — {ev.photo_count ?? 0} frames
              </option>
            ))}
          </select>
        </div>
      </section>

      {feedback && (
        <div className="admin-gallery__feedback" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')}>
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="admin-gallery__error" role="alert">
          {errorMsg}
        </div>
      )}

      {/* 2. Upload Section */}
      <PhotoUploader
        eventId={selectedEventId}
        eventName={activeEvent?.name}
        onUploadComplete={handleUploadComplete}
      />

      {/* 3. Gallery Controls */}
      <section className="admin-gallery__controls">
        <div className="admin-gallery__controls-left">
          <h3>
            Event Photographs{' '}
            <span className="admin-gallery__count-pill">{totalCount} shown</span>
          </h3>
        </div>

        <div className="admin-gallery__controls-right">
          <input
            type="search"
            className="admin-gallery__search"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
          />

          <select
            className="admin-gallery__sort"
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value)
              setPage(1)
            }}
            aria-label="Sort photographs"
          >
            <option value="-uploaded_at">Newest Uploaded First</option>
            <option value="uploaded_at">Oldest Uploaded First</option>
            <option value="original_filename">Filename (A &ndash; Z)</option>
            <option value="-original_filename">Filename (Z &ndash; A)</option>
            <option value="-file_size">Largest File Size</option>
          </select>

          <button
            type="button"
            className="btn btn-outline admin-gallery__refresh-btn"
            onClick={loadEventPhotos}
          >
            Refresh
          </button>
        </div>
      </section>

      {/* 4. Photo Gallery Grid */}
      <PhotoGrid
        photos={photos}
        loading={photosLoading}
        onSelectPhoto={setSelectedPhoto}
        onDeletePhoto={handleDeletePhoto}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* 5. High-Res Lightbox Preview */}
      <PhotoLightboxModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onDelete={handleDeletePhoto}
      />
    </div>
  )
}

export default AdminGallery
