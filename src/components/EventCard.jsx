import './EventCard.css'

function EventCard({ event, onSelect }) {
  const displayName = event.coupleName || event.title

  const handleClick = () => {
    if (onSelect) onSelect(event)
  }

  return (
    <article
      className="event-card event-card--editorial"
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`View gallery for ${displayName}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="event-card__media">
        <img
          src={event.coverImage}
          alt={displayName}
          className="event-card__img"
          loading="lazy"
        />
        <div className="event-card__overlay">
          <div className="event-card__overlay-content">
            <span className="event-card__location">{event.location}</span>
            <h3 className="event-card__name">{displayName}</h3>
            {onSelect && (
              <span className="event-card__preview-link">
                <span>Preview Gallery</span>
                <svg
                  className="event-card__chevron"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export default EventCard
