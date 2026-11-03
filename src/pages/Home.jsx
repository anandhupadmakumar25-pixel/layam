import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import SectionHeader from "../components/SectionHeader.jsx";
import ServiceCard from "../components/ServiceCard.jsx";
import EventCard from "../components/EventCard.jsx";
import EventLightbox from "../components/EventLightbox.jsx";
import {
  STUDIO_STATS,
  SERVICES_DATA,
  FEATURED_EVENTS,
} from "../data/studioData.js";
import "./Home.css";

function Home() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const totalServices = SERVICES_DATA.length;

  // Extended slides for seamless, continuous infinite sliding: [clone of last, ...all, clone of first]
  const extendedSlides = [
    SERVICES_DATA[totalServices - 1],
    ...SERVICES_DATA,
    SERVICES_DATA[0],
  ];

  const [displayIndex, setDisplayIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isServicesPaused, setIsServicesPaused] = useState(false);
  const isJumpingRef = useRef(false);
  const videoRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Compute the current active service index (0 to totalServices - 1)
  const realServiceIndex = (displayIndex - 1 + totalServices) % totalServices;
  const currentService = SERVICES_DATA[realServiceIndex] || SERVICES_DATA[0];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be deferred until user interaction by browser policy
      });
    }
  }, []);

  const handleNextService = () => {
    if (isJumpingRef.current) return;
    setIsTransitioning(true);
    setDisplayIndex((prev) => {
      if (prev >= extendedSlides.length - 1) return prev;
      return prev + 1;
    });
  };

  const handlePrevService = () => {
    if (isJumpingRef.current) return;
    setIsTransitioning(true);
    setDisplayIndex((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  };

  const handleSelectService = (targetIndex) => {
    if (isJumpingRef.current) return;
    setIsTransitioning(true);
    setDisplayIndex(targetIndex + 1);
  };

  const resetInfiniteClone = () => {
    if (displayIndex === extendedSlides.length - 1) {
      isJumpingRef.current = true;
      setIsTransitioning(false);
      setDisplayIndex(1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
          isJumpingRef.current = false;
        });
      });
    } else if (displayIndex === 0) {
      isJumpingRef.current = true;
      setIsTransitioning(false);
      setDisplayIndex(totalServices);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
          isJumpingRef.current = false;
        });
      });
    }
  };

  const handleTransitionEnd = () => {
    resetInfiniteClone();
  };

  useEffect(() => {
    if (displayIndex === extendedSlides.length - 1 || displayIndex === 0) {
      const timer = setTimeout(() => {
        resetInfiniteClone();
      }, 820);
      return () => clearTimeout(timer);
    }
  }, [displayIndex]);

  // Smooth auto-slide every 2.8s; pauses while hovered or touched
  useEffect(() => {
    if (isServicesPaused) return;

    const timer = setInterval(() => {
      handleNextService();
    }, 2800);

    return () => clearInterval(timer);
  }, [isServicesPaused, displayIndex]);

  const handleTouchStart = (e) => {
    setIsServicesPaused(true);
    if (e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    setIsServicesPaused(false);
    if (touchStartX.current === null) return;
    if (e.changedTouches && e.changedTouches[0]) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX.current - touchEndX;
      const diffY = touchStartY.current - touchEndY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) {
          handleNextService();
        } else {
          handlePrevService();
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const otherServices = SERVICES_DATA.map((service, index) => ({
    service,
    index,
  })).filter(({ index }) => index !== realServiceIndex);

  return (
    <div className="home-page">
      {/* 2. Premium Hero Section with Large Cinematography Video Background */}
      <section className="hero-banner">
        <div className="hero-banner__media">
          <video
            ref={videoRef}
            className="hero-banner__video"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85"
          >
            <source src="/hero-bg.MP4" type="video/mp4" />
            <source src="/hero-bg.MP4" type="video/mp4" />
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85"
              alt="Luxury wedding celebration captured by Layam Wedding Cinemas"
              className="hero-banner__img"
            />
          </video>
          <div className="hero-banner__overlay" />
        </div>

        <div className="container hero-banner__content fade-up">
          <span className="hero-banner__eyebrow">
            INDIA &bull; UAE
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
            <a
              href="#portfolio"
              className="btn btn-gold hover-elevate"
              onClick={(e) => {
                const el = document.getElementById('portfolio');
                if (el) {
                  e.preventDefault();
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <span>Explore Our Gallery</span>
            </a>
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
      <section className="home-intro" id="about">
        <div className="container home-intro__grid">
          <div className="home-intro__visuals">
            <div className="home-intro__primary-img-wrap">
              <img
                src="/about-couple.jpg"
                alt="Kavya & Basil wedding celebration captured by Layam Wedding Cinemas"
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

      {/* 4. Photography Services & Packages Showcase */}
      <section className="home-services" id="services">
        <div className="container">
          <SectionHeader
            eyebrow="Bespoke Commissions"
            title="Photography Services"
            subtitle="Tailored coverage for multi-day destination weddings, executive portraiture, black-tie galas, and luxury brand campaigns."
          />

          <div
            className="services-showcase"
            onMouseEnter={() => setIsServicesPaused(true)}
            onMouseLeave={() => setIsServicesPaused(false)}
          >
            {/* Main Featured Card with Smooth Sliding Track */}
            <div
              className="services-showcase__card"
              tabIndex={0}
              aria-label={`${currentService.category}: ${currentService.title}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="services-showcase__track"
                style={{
                  transform: `translateX(-${displayIndex * 100}%)`,
                  transition: isTransitioning
                    ? 'transform 0.8s cubic-bezier(0.25, 1, 0.35, 1)'
                    : 'none',
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {extendedSlides.map((slide, sIdx) => (
                  <div
                    key={`${slide.id}-${sIdx}`}
                    className="services-showcase__slide"
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="services-showcase__card-img"
                      loading={sIdx === 1 ? 'eager' : 'lazy'}
                    />
                    <div className="services-showcase__overlay">
                      <div className="services-showcase__details">
                        <span className="services-showcase__category-badge">
                          {slide.category}
                        </span>
                        <h3 className="services-showcase__title">
                          {slide.title}
                        </h3>
                        <p className="services-showcase__desc">
                          {slide.shortDescription}
                        </p>
                        <div className="services-showcase__meta">
                          <span className="services-showcase__investment">
                            {slide.investment}
                          </span>
                        </div>
                        <Link
                          to="/contact"
                          className="services-showcase__inquire-btn"
                        >
                          <span>Inquire &rarr;</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: small square cards for other services, perfectly flush to the bottom */}
            <div className="services-showcase__thumbs">
              {otherServices.map(({ service, index }) => (
                <button
                  key={service.id}
                  type="button"
                  className="services-showcase__thumb"
                  onClick={() => handleSelectService(index)}
                  title={service.category}
                  aria-label={`View ${service.category}`}
                >
                  <img
                    src={service.image}
                    alt={service.category}
                    className="services-showcase__thumb-img"
                  />
                </button>
              ))}
            </div>

            {/* Under the card: left arrow, center-aligned title, right arrow */}
            <div className="services-showcase__nav">
              <button
                type="button"
                className="services-showcase__arrow services-showcase__arrow--prev"
                onClick={handlePrevService}
                aria-label="Previous Service"
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M 14,7 Q 10,13.5 4,16 Q 10,18.5 14,25" />
                  <line x1="4" y1="16" x2="28" y2="16" />
                </svg>
              </button>

              <h3
                key={currentService.id}
                className="services-showcase__nav-title"
              >
                {currentService.category}
              </h3>

              <button
                type="button"
                className="services-showcase__arrow services-showcase__arrow--next"
                onClick={handleNextService}
                aria-label="Next Service"
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M 18,7 Q 22,13.5 28,16 Q 22,18.5 18,25" />
                  <line x1="4" y1="16" x2="28" y2="16" />
                </svg>
              </button>
            </div>

            {/* Directly bottom of wedding shoots with arrow, centered */}
            <div className="services-showcase__cta">
              <Link to="/services" className="btn btn-outline hover-elevate">
                <span>View Full Service Guide &amp; Packages &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Featured Event Gallery Section */}
      <section className="home-events" id="portfolio">
        <div className="container">
          <SectionHeader
            eyebrow="Curated Archives"
            title="Featured Event Gallery"
            subtitle="Step inside recent celebrations, royal matrimonies, corporate summits, and fine art portraits."
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
              <span>Explore All Curated Archives &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Call-to-Action Section */}
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

      {/* Golden Flowing Line Divider */}
      <div className="golden-flowing-divider" aria-hidden="true">
        <div className="golden-flowing-line" />
        <div className="golden-flowing-accent">✦</div>
      </div>

      <EventLightbox
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

export default Home;
