import './EventCard.css'

function EventCard({ event, onSelect }) {
  return (
    <article className="event-card">
      <div className="event-card__media">
        <img
          src={event.coverImage}
          alt={event.title}
          className="event-card__img"
          loading="lazy"
        />
        <div className="event-card__badges">
          <span className="event-card__category">{event.category}</span>
          <span className="event-card__count">{event.photoCount} Frames</span>
        </div>
      </div>

      <div className="event-card__content">
        <div className="event-card__meta">
          <span>{event.date}</span>
          <span className="event-card__sep">&bull;</span>
          <span>{event.location}</span>
        </div>

        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__excerpt">{event.excerpt}</p>

        <div className="event-card__footer">
          <span className="event-card__smart-tag">Smart Gallery Enabled</span>
          {onSelect && (
            <button
              type="button"
              className="event-card__preview-btn"
              onClick={() => onSelect(event)}
            >
              Preview Gallery &rarr;
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default EventCard

