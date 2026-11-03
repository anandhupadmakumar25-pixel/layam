import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './ServiceCard.css'

function ServiceCard({ service, detailed = false }) {
  const [activeImg, setActiveImg] = useState(service.image)

  useEffect(() => {
    setActiveImg(service.image)
  }, [service.image])

  return (
    <article className={`service-card ${detailed ? 'service-card--detailed' : ''}`}>
      <div
        className="service-card__media"
        style={{ '--service-bg': `url("${activeImg || service.image}")` }}
      >
        <img
          src={activeImg || service.image}
          alt={service.title}
          className="service-card__img"
          loading="lazy"
          decoding="async"
        />
        <span className="service-card__category">{service.category}</span>
      </div>

      <div className="service-card__body">
        <h3 className="service-card__title">{service.title}</h3>
        <p className="service-card__desc">
          {detailed ? service.fullDescription : service.shortDescription}
        </p>

        {detailed && service.gallery && service.gallery.length > 0 && (
          <div className="service-card__gallery">
            <h4 className="service-card__subhead">Collection Preview ({service.gallery.length} Frames)</h4>
            <div className="service-card__gallery-thumbs">
              {service.gallery.map((imgUrl, idx) => (
                <button
                  key={imgUrl}
                  type="button"
                  className={`service-card__gallery-thumb ${activeImg === imgUrl ? 'is-active' : ''}`}
                  onClick={() => setActiveImg(imgUrl)}
                  aria-label={`View frame ${idx + 1}`}
                  title={`View frame ${idx + 1}`}
                >
                  <img src={imgUrl} alt={`${service.category} frame ${idx + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {detailed && service.deliverables && (
          <div className="service-card__deliverables">
            <h4 className="service-card__subhead">Included Deliverables</h4>
            <ul>
              {service.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="service-card__footer">
          <div className="service-card__meta">
            <span className="service-card__investment">{service.investment}</span>
            {detailed && <span className="service-card__turnaround">{service.turnaround}</span>}
          </div>
          <Link to="/contact" className="service-card__link">
            Inquire &rarr;
          </Link>
        </div>
      </div>
    </article>
  )
}

export default ServiceCard
