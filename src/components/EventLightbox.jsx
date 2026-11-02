import './EventLightbox.css'

function EventLightbox({ event, onClose }) {
  if (!event) return null

  return (
    <div className="event-lightbox" role="dialog" aria-modal="true" aria-label={event.title}>
      <div className="event-lightbox__backdrop" onClick={onClose} />
      <div className="event-lightbox__dialog">
        <div className="event-lightbox__header">
          <div>
            <span className="event-lightbox__eyebrow">
              {event.category} &bull; {event.location}
            </span>
            <h3 className="event-lightbox__title">{event.title}</h3>
          </div>
          <button
            type="button"
            className="event-lightbox__close"
            onClick={onClose}
            aria-label="Close gallery preview"
          >
            &times;
          </button>
        </div>

        <p className="event-lightbox__desc">
          {event.excerpt} — Curated selection from {event.photoCount} archived master frames.
        </p>

        <div className="event-lightbox__grid">
          {event.galleryPreview.map((imgUrl, index) => (
            <div key={imgUrl} className="event-lightbox__item">
              <img
                src={imgUrl}
                alt={`${event.title} frame ${index + 1}`}
                className="event-lightbox__img"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default EventLightbox

