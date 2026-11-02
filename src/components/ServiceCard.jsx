import { Link } from 'react-router-dom'
import './ServiceCard.css'

function ServiceCard({ service, detailed = false }) {
  return (
    <article className={`service-card ${detailed ? 'service-card--detailed' : ''}`}>
      <div className="service-card__media">
        <img
          src={service.image}
          alt={service.title}
          className="service-card__img"
          loading="lazy"
        />
        <span className="service-card__category">{service.category}</span>
      </div>

      <div className="service-card__body">
        <h3 className="service-card__title">{service.title}</h3>
        <p className="service-card__desc">
          {detailed ? service.fullDescription : service.shortDescription}
        </p>

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

