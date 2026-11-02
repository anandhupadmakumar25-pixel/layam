import { useState } from "react";
import { Link } from "react-router-dom";
import SectionHeader from "../components/SectionHeader.jsx";
import ServiceCard from "../components/ServiceCard.jsx";
import EventCard from "../components/EventCard.jsx";
import EventLightbox from "../components/EventLightbox.jsx";
import {
  STUDIO_STATS,
  SERVICES_DATA,
  FEATURED_EVENTS,
  SMART_GALLERY_STEPS,
} from "../data/studioData.js";
import "./Home.css";

function Home() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div className="home-page">
      {/* 2. Premium Hero Section with Large Photography Background */}
      <section className="hero-banner">
        <div className="hero-banner__media">
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85"
            alt="Luxury wedding celebration captured by Layam Wedding Cinemas"
            className="hero-banner__img"
          />
          <div className="hero-banner__overlay" />
        </div>

        <div className="container hero-banner__content fade-up">
          <span className="hero-banner__eyebrow">
            NEW YORK &bull; PARIS &bull; LAKE COMO &bull; KYOTO
          </span>
          <h1 className="hero-banner__title">
            Timeless Fine Art Cinematography &amp; Photography.
            <span className="hero-banner__title-sub">
              <em>Effortless Intelligent Guest Delivery.</em>
            </span>
          </h1>
          <p className="hero-banner__subtitle">
            We document the world’s most extraordinary destination weddings, royal celebrations, and editorial commissions across the globe—paired with bespoke cloud archives and instant biometric indexing that deliver every guest’s master portrait in seconds.
          </p>
          <div className="hero-banner__actions">
            <Link to="/events" className="btn btn-gold hover-elevate">
              <span>Explore Portfolio</span>
            </Link>
            <a href="#concierge-portal" className="btn btn-outline-light hover-elevate">
              <span>Guest &amp; Client Access</span>
            </a>
            <Link to="/admin/login" className="btn btn-login hover-elevate">
              <span>🔐 Studio Staff Login</span>
            </Link>
          </div>
        </div>

        <div className="hero-banner__stats-bar">
          <div className="container hero-banner__stats-grid">
            {STUDIO_STATS.map((stat) => (
              <div key={stat.label} className="hero-banner__stat">
                <span className="hero-banner__stat-value">{stat.value}</span>
                <span className="hero-banner__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Studio Introduction Section */}
      <section className="home-intro">
        <div className="container home-intro__grid">
          <div className="home-intro__visuals">
            <div className="home-intro__primary-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85"
                alt="Editorial couple portrait in natural light"
                className="home-intro__primary-img"
              />
            </div>
            <div className="home-intro__secondary-card">
              <span className="home-intro__quote-mark">&ldquo;</span>
              <p>
                Photography is the quiet preservation of legacy—crafted with
                medium-format depth and delivered with modern grace.
              </p>
              <span className="home-intro__signature">
                — Layam, Creative Director
              </span>
            </div>
          </div>

          <div className="home-intro__copy">
            <span className="home-intro__eyebrow">Our Studio Philosophy</span>
            <h2 className="home-intro__title">
              Where Editorial Craft Meets Intelligent Archiving
            </h2>
            <div className="home-intro__divider" />
            <p className="home-intro__lead">
              Layam Wedding Cinemas was born from a singular
              conviction: luxury wedding cinematography and photography deserves an equally refined viewing
              and delivery experience.
            </p>
            <p className="home-intro__body">
              Our photographers shoot with a calm, observational
              cadence—capturing architectural scale, candid emotion, and
              sartorial detail without intrusion. Behind the scenes, our
              proprietary Smart Gallery architecture indexes every frame so
              hosts and guests receive their personal high-resolution portraits
              effortlessly.
            </p>
            <div className="home-intro__highlights">
              <div>
                <strong>Medium-Format Artistry</strong>
                <span>
                  Museum-grade color profiles and archival tonal depth.
                </span>
              </div>
              <div>
                <strong>Private Cloud Concierge</strong>
                <span>
                  Encrypted guest galleries with instant photo discovery.
                </span>
              </div>
            </div>
            <Link to="/about" className="btn btn-outline hover-elevate">
              Discover Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Photography Services Section */}
      <section className="home-services">
        <div className="container">
          <SectionHeader
            eyebrow="Bespoke Commissions"
            title="Photography Services"
            subtitle="Tailored coverage for multi-day destination weddings, executive portraiture, black-tie galas, and luxury brand campaigns."
          />

          <div className="home-services__grid">
            {SERVICES_DATA.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          <div className="home-services__cta">
            <Link to="/services" className="btn btn-primary hover-elevate">
              View Full Service Guide &amp; Packages
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Featured Event Gallery Section */}
      <section className="home-events">
        <div className="container">
          <SectionHeader
            eyebrow="Curated Archives"
            title="Featured Event Gallery"
            subtitle="Step inside recent celebrations and editorial productions documented across the globe."
          />

          <div className="home-events__grid">
            {FEATURED_EVENTS.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={setSelectedEvent}
              />
            ))}
          </div>

          <div className="home-events__cta">
            <Link to="/events" className="btn btn-outline hover-elevate">
              Explore All Featured Events
            </Link>
          </div>
        </div>
      </section>

      {/* 6. How Our Smart Photo Gallery Works Section */}
      <section className="home-workflow">
        <div className="container">
          <SectionHeader
            eyebrow="Intelligent Delivery"
            title="How Our Smart Photo Gallery Works"
            subtitle="An effortless four-stage experience engineered for complete privacy, speed, and archival permanence."
          />

          <div className="home-workflow__grid">
            {SMART_GALLERY_STEPS.map((item) => (
              <div key={item.step} className="workflow-card hover-elevate">
                <span className="workflow-card__number">{item.step}</span>
                <h3 className="workflow-card__title">{item.title}</h3>
                <p className="workflow-card__desc">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Guest Access & Studio Dashboard Section */}
      <section className="home-concierge" id="concierge-portal">
        <div className="container">
          <SectionHeader
            eyebrow="Direct Portals"
            title="Guest Access &amp; Studio Dashboard"
            subtitle="Choose your portal below to find your celebration photos or open the photographer and staff management dashboard."
          />

          <div className="home-concierge__grid">
            {/* Guest Portal Card */}
            <div className="concierge-card concierge-card--guest hover-elevate fade-up">
              <div className="concierge-card__badge">✦ Honored Guest Portal</div>
              <h3 className="concierge-card__title">Find Your Celebration Portraits</h3>
              <p className="concierge-card__desc">
                Attending a Layam celebration? Scan the on-site QR placard or enter with your event code. Upload a quick reference portrait to let our biometric indexing instantly curate all your photos.
              </p>
              <ul className="concierge-card__features">
                <li><span>✓</span> Instant private face-match gallery</li>
                <li><span>✓</span> Master high-resolution digital downloads</li>
                <li><span>✓</span> Zero app installation required</li>
              </ul>
              <div className="concierge-card__actions">
                <Link to="/events" className="btn btn-gold hover-elevate">
                  Explore Curated Archives
                </Link>
                <Link to="/contact" className="btn btn-outline hover-elevate">
                  Inquire With Concierge
                </Link>
              </div>
            </div>

            {/* Staff / Photographer Studio Card */}
            <div className="concierge-card concierge-card--staff hover-elevate fade-up delay-1">
              <div className="concierge-card__badge concierge-card__badge--gold">⚡ Studio Admin Dashboard</div>
              <h3 className="concierge-card__title">Photographer &amp; Studio Admin</h3>
              <p className="concierge-card__desc">
                For Layam directors, cinematographers, and event leads. 1-click live event setup, automatic QR placard printing, real-time photo uploads, and facial indexing.
              </p>
              <ul className="concierge-card__features">
                <li><span>✓</span> 1-Click Live Event Station &amp; Placards</li>
                <li><span>✓</span> High-speed drag-and-drop photo indexing</li>
                <li><span>✓</span> Super Admin role &amp; menu access control</li>
              </ul>
              <div className="concierge-card__actions">
                <Link to="/admin" className="btn btn-primary hover-elevate">
                  Open Studio Dashboard
                </Link>
                <Link to="/admin/login" className="btn btn-login hover-elevate">
                  🔐 Studio Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call-to-Action Section */}
      <section className="home-cta">
        <div className="container home-cta__inner fade-up">
          <span className="home-cta__eyebrow">
            Limited 2026 &amp; 2027 Commissions
          </span>
          <h2 className="home-cta__title">
            Let Us Document Your Next Extraordinary Gathering
          </h2>
          <p className="home-cta__desc">
            We accept a select number of weddings, galas, and editorial
            productions each season to ensure uncompromising creative devotion.
          </p>
          <div className="home-cta__buttons">
            <Link to="/contact" className="btn btn-gold hover-elevate">
              Reserve Your Date
            </Link>
            <Link to="/services" className="btn btn-outline-light hover-elevate">
              Review Investment Guide
            </Link>
          </div>
        </div>
      </section>

      <EventLightbox
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

export default Home;
