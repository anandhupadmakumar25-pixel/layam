import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader.jsx'
import ServiceCard from '../components/ServiceCard.jsx'
import { SERVICES_DATA } from '../data/studioData.js'
import './Services.css'

const BESPOKE_TIERS = [
  {
    name: 'Signature Editorial Day',
    price: '$3,800',
    idealFor: 'Intimate Celebrations, Galas & Portrait Commissions',
    features: [
      'Up to 8 hours of continuous coverage',
      'Lead Photographer + Lighting Assistant',
      '400+ master-graded high-resolution photographs',
      'Private Smart Gallery with instant face discovery',
      '48-hour press & social highlight selects',
    ],
  },
  {
    name: 'Grand Destination Weekend',
    price: '$8,500',
    featured: true,
    idealFor: 'Multi-Day Luxury Weddings & International Soirées',
    features: [
      '3 days of comprehensive event & rehearsal coverage',
      'Principal Creative Director + 2 Senior Photographers',
      'Medium-format digital & 120mm film capture',
      'Dedicated Smart Gallery portal with VIP guest QR access',
      'Handcrafted Italian linen heirloom album (80 pages)',
    ],
  },
  {
    name: 'Commercial & Maison Retainer',
    price: 'Custom Quote',
    idealFor: 'Luxury Hospitality, Architecture & Fashion Houses',
    features: [
      'Seasonal campaign & lookbook art direction',
      'Tethered studio or architectural location production',
      'Dedicated edge archive for global PR & press teams',
      'Full international print & digital licensing',
      'Priority 72-hour master asset turnaround',
    ],
  },
]

function Services() {
  return (
    <div className="services-page">
      {/* Hero */}
      <section className="services-hero">
        <div className="container services-hero__inner fade-up">
          <span className="services-hero__eyebrow">Bespoke Photography &amp; Archiving</span>
          <h1 className="services-hero__title">Our Photography Services</h1>
          <p className="services-hero__subtitle">
            Every commission is tailored to the scale, light, and cadence of your gathering—combining
            fine-art direction with our signature Smart Gallery delivery suite.
          </p>
        </div>
      </section>

      {/* Detailed Service Cards */}
      <section className="services-catalog">
        <div className="container">
          <SectionHeader
            eyebrow="Specializations"
            title="Curated Disciplines"
            subtitle="Explore our core photography divisions and standard deliverables."
          />

          <div className="services-catalog__grid">
            {SERVICES_DATA.map((service) => (
              <ServiceCard key={service.id} service={service} detailed />
            ))}
          </div>
        </div>
      </section>

      {/* Investment Tiers / Packages */}
      <section className="services-tiers" id="packages">
        <div className="container">
          <SectionHeader
            eyebrow="Investment Guide"
            title="Signature Collections"
            subtitle="Transparent starting collections that can be customized with additional photographers, film stock, and archival print suites."
          />

          <div className="services-tiers__grid">
            {BESPOKE_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`tier-card ${tier.featured ? 'tier-card--featured' : ''}`}
              >
                {tier.featured && <span className="tier-card__badge">Most Commissioned</span>}
                <h3 className="tier-card__name">{tier.name}</h3>
                <p className="tier-card__price">{tier.price}</p>
                <p className="tier-card__ideal">{tier.idealFor}</p>
                <ul className="tier-card__list">
                  {tier.features.map((feat) => (
                    <li key={feat}>{feat}</li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  className={`btn ${tier.featured ? 'btn-gold' : 'btn-outline'} tier-card__btn`}
                >
                  Let's Connect
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Services
