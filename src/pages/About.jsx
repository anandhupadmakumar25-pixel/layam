import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader.jsx'
import './About.css'

const TESTIMONIALS = [
  {
    quote:
      "Working with Layam was like having visual poets at our wedding. Every frame captured the sacred sanctity of our rituals with breathtaking depth and effortless poise.",
    author: "Kavya & Basil",
    event: "Grand Heritage Wedding, Taj Malabar",
  },
  {
    quote:
      "The discreet presence, timeless editorial lighting, and sheer artistry exceeded all our expectations. Our family heirloom album is a true masterpiece we will treasure forever.",
    author: "Ananya & Aarav",
    event: "Destination Royal Matrimony, Kochi",
  },
  {
    quote:
      "From the sunset engagement shoot to our reception cinema, their creative vision was flawless. Sensitive, modern, and profoundly emotional storytelling.",
    author: "Meera & Siddharth",
    event: "Scenic Pre-Wedding & Celebration, Wayanad",
  },
]

function About() {
  return (
    <div className="about-page">
      {/* Page Hero */}
      <section className="about-hero">
        <div className="container about-hero__inner fade-up">
          <span className="about-hero__eyebrow">Est. 2018 &bull; Kerala, India</span>
          <h1 className="about-hero__title">
            A Modern Photography House Devoted to Permanence
          </h1>
          <p className="about-hero__subtitle">
            Layam Wedding Cinemas unites the tactile soul of cinematic wedding filmmaking with
            intelligent cloud archiving for the world’s most discerning hosts.
          </p>
        </div>

        {/* Hero Bottom Quote Bar (Same as Hero Banner Bottom) */}
        <div className="hero-banner__quote-bar about-hero__quote-bar">
          <div className="container hero-banner__quote-content">
            <span className="hero-banner__quote-eyebrow">THE ART OF PRESERVING MEMORIES</span>
            <blockquote className="hero-banner__quote-text">
              &ldquo;Life happens in moments. We make them timeless.&rdquo;
            </blockquote>
          </div>
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
              destination weddings, royal celebrations, and bespoke family milestones.
            </p>
            <p>
              Yet we noticed a persistent disconnect: while our films and photographs were crafted to
              museum standards, guests and hosts often waited weeks to sift through thousands of
              unindexed files. In response, we engineered the Layam Intelligent Archive—combining bespoke
              color grading with instant, privacy-first photo discovery.
            </p>
          </div>

          <div className="about-story__images">
            <img
              src="/about-couple.jpg"
              alt="Wedding celebration captured by Layam Wedding Cinemas"
              className="about-story__img-main"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="about-testimonials">
        <div className="container">
          <SectionHeader
            eyebrow="Kind Words"
            title="Testimonials"
            subtitle="Reflections from celebrated weddings, grand celebrations, and editorial commissions."
          />

          <div className="about-testimonials__grid">
            {TESTIMONIALS.map((item, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-card__quote-mark">&ldquo;</div>
                <p className="testimonial-card__text">{item.quote}</p>
                <div className="testimonial-card__author-wrap">
                  <h4 className="testimonial-card__author">{item.author}</h4>
                  <span className="testimonial-card__event">{item.event}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="about-cta">
        <div className="container about-cta__inner">
          <h2>Book an Appointment</h2>
          <p>
            Schedule a private consultation at our studio or connect with our creative director
            to discuss your upcoming celebration.
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
