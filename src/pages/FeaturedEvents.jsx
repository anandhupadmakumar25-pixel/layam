import { useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import EventLightbox from '../components/EventLightbox.jsx'
import { FEATURED_EVENTS } from '../data/studioData.js'
import './FeaturedEvents.css'

const CATEGORIES = [
  'All',
  'Matrimony & Celebration',
  'Corporate Events',
  'Brand Concept Shoots',
  'Moments & Celebrations',
]

function FeaturedEvents() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedEvent, setSelectedEvent] = useState(null)

  const filteredEvents =
    activeCategory === 'All'
      ? FEATURED_EVENTS
      : FEATURED_EVENTS.filter((ev) => ev.category === activeCategory)

  return (
    <div className="events-page">
      {/* Hero */}
      <section className="events-hero">
        <div className="container events-hero__inner fade-up">
          <span className="events-hero__eyebrow">Exhibition &amp; Client Archives</span>
          <h1 className="events-hero__title">Featured Events</h1>
          <p className="events-hero__subtitle">
            Explore a curated selection of international weddings, philanthropic galas, and
            editorial productions archived on the Layam Wedding Cinemas platform.
          </p>
        </div>
      </section>

      {/* Filter Bar & Grid */}
      <section className="events-showcase">
        <div className="container">
          <div className="events-filter" role="tablist" aria-label="Filter events by category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`events-filter__btn ${activeCategory === cat ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="events-showcase__grid">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} onSelect={setSelectedEvent} />
            ))}
          </div>
        </div>
      </section>

      <EventLightbox event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}

export default FeaturedEvents
