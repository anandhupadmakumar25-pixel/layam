import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader.jsx'
import { TEAM_MEMBERS, STUDIO_STATS } from '../data/studioData.js'
import './About.css'

const PILLARS = [
  {
    number: 'I',
    title: 'Editorial Poise',
    description:
      'Every frame is composed with architectural balance and natural-light sensitivity inspired by classic fashion houses and cinema.',
  },
  {
    number: 'II',
    title: 'Absolute Discretion',
    description:
      'We work quietly within private estates, diplomatic gatherings, and intimate ceremonies—preserving authenticity without disruption.',
  },
  {
    number: 'III',
    title: 'Archival Intelligence',
    description:
      'Our custom cloud infrastructure pairs museum-grade color mastering with instant, privacy-first guest photo discovery.',
  },
]

function About() {
  return (
    <div className="about-page">
      {/* Page Hero */}
      <section className="about-hero">
        <div className="container about-hero__inner fade-up">
          <span className="about-hero__eyebrow">Est. 2018 &bull; New York &amp; Milan</span>
          <h1 className="about-hero__title">
            A Modern Photography House Devoted to Permanence
          </h1>
          <p className="about-hero__subtitle">
            Layam Wedding Cinemas unites the tactile soul of cinematic wedding filmmaking with
            intelligent cloud archiving for the world’s most discerning hosts.
          </p>
        </div>
      </section>

      {/* Story Split Section */}
      <section className="about-story">
        <div className="container about-story__grid">
          <div className="about-story__copy">
            <span className="about-story__label">Our Heritage</span>
            <h2>From Darkroom Craft to Intelligent Cloud Archives</h2>
            <p>
              Layam Wedding Cinemas began as an independent fine-art wedding cinematography and
              editorial collective. For years, our directors photographed and filmed international
              destination weddings, royal galas, and bespoke architectural celebrations.
            </p>
            <p>
              Yet we noticed a persistent disconnect: while our films and photographs were crafted to
              museum standards, guests and hosts often waited weeks to sift through thousands of
              unindexed files. In response, we engineered the Layam Intelligent Archive—combining bespoke
              color grading with instant, privacy-first photo discovery.
            </p>
            <div className="about-story__stats">
              {STUDIO_STATS.map((stat) => (
                <div key={stat.label} className="about-story__stat-item">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-story__images">
            <img
              src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1000&q=85"
              alt="Photographer working with medium format camera in studio"
              className="about-story__img-main"
            />
          </div>
        </div>
      </section>

      {/* Studio Pillars */}
      <section className="about-pillars">
        <div className="container">
          <SectionHeader
            eyebrow="Guiding Principles"
            title="The Three Pillars of Layam Wedding Cinemas"
            subtitle="Every commission is governed by uncompromising visual standards and effortless hospitality."
          />

          <div className="about-pillars__grid">
            {PILLARS.map((pillar) => (
              <div key={pillar.number} className="pillar-card">
                <span className="pillar-card__num">{pillar.number}</span>
                <h3 className="pillar-card__title">{pillar.title}</h3>
                <p className="pillar-card__desc">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creative Leadership */}
      <section className="about-team">
        <div className="container">
          <SectionHeader
            eyebrow="Creative Leadership"
            title="Meet the Principals"
            subtitle="A multidisciplinary collective of editorial photographers, colorists, and archival systems engineers."
          />

          <div className="about-team__grid">
            {TEAM_MEMBERS.map((member) => (
              <article key={member.name} className="team-card">
                <div className="team-card__media">
                  <img src={member.image} alt={member.name} className="team-card__img" />
                </div>
                <div className="team-card__body">
                  <span className="team-card__role">{member.role}</span>
                  <h3 className="team-card__name">{member.name}</h3>
                  <p className="team-card__bio">{member.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="about-cta">
        <div className="container about-cta__inner">
          <h2>Visit Our SoHo Showroom or Schedule a Private Consultation</h2>
          <p>
            Experience our handbound Italian linen albums and test our Smart Gallery suite in
            person or via private video salon.
          </p>
          <Link to="/contact" className="btn btn-primary">
            Book an Appointment
          </Link>
        </div>
      </section>
    </div>
  )
}

export default About

