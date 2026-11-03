import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

const WHATSAPP_NUMBERS = [
  {
    region: 'India',
    display: '+91 85890 50510',
    url: 'https://wa.me/918589050510?text=Hello%20Layam%20Wedding%20Cinemas,%20I%20would%20like%20to%20inquire%20about%20your%20services',
  },
  {
    region: 'Dubai',
    display: '+971 52 960 7091',
    url: 'https://wa.me/971529607091?text=Hello%20Layam%20Wedding%20Cinemas,%20I%20would%20like%20to%20inquire%20about%20your%20services',
  },
]

function WhatsAppIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function Footer() {
  const [waOpen, setWaOpen] = useState(false)
  const waContainerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (waContainerRef.current && !waContainerRef.current.contains(e.target)) {
        setWaOpen(false)
      }
    }
    if (waOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [waOpen])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <footer className="minimal-footer">
        <div className="container minimal-footer__container">
          {/* Top: Instagram Camera Outline Icon + Handle */}
          <div className="minimal-footer__instagram-top">
            <a
              href="https://www.instagram.com/_layam_wedding_cinemas_?dlrf=MTB6OTAyMzAwZ2xpbQ=="
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__ig-link"
              aria-label="Instagram @_layam_wedding_cinemas_"
            >
              <svg
                className="minimal-footer__ig-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <span className="minimal-footer__handle">@LAYAMWEDDINGCINEMAS</span>
            </a>
          </div>

          {/* 4 Official Social Icons: Facebook, Instagram, YouTube, LinkedIn */}
          <div className="minimal-footer__socials" aria-label="Social media channels">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/layamhari/"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="Facebook"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/_layam_wedding_cinemas_?dlrf=MTB6OTAyMzAwZ2xpbQ=="
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="Instagram"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com/@layamweddingcinemas?si=X9mgYn1fBNASanmx"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="YouTube"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/layam-wedding-cinemas-59069b346?utm_source=share_via&utm_content=profile&utm_medium=member_ios"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="LinkedIn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>

          {/* Minimal Horizontal Navigation Links */}
          <nav className="minimal-footer__nav" aria-label="Footer navigation">
            <Link to="/" className="minimal-footer__nav-link">HOME</Link>
            <Link to="/about" className="minimal-footer__nav-link">ABOUT</Link>
            <Link to="/services" className="minimal-footer__nav-link">SERVICES &amp; PACKAGES</Link>
            <Link to="/events" className="minimal-footer__nav-link">PORTFOLIO</Link>
            <Link to="/contact" className="minimal-footer__nav-link">CONTACT</Link>
          </nav>

          {/* Copyright Notice */}
          <p className="minimal-footer__copyright">
            All content Copyright &copy; {new Date().getFullYear()} Layam Wedding Cinemas
          </p>

          {/* Centered Scroll to Top Button */}
          <div className="minimal-footer__scroll-top-wrap">
            <button
              type="button"
              className="minimal-footer__scroll-top-btn"
              onClick={scrollToTop}
              aria-label="Scroll back to top"
              title="Back to top"
            >
              <svg
                width="18"
                height="52"
                viewBox="0 0 24 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 3.5,15.5 C 8,15.5 12,10 12,3.5 C 12,10 16,15.5 20.5,15.5" />
                <line x1="12" y1="3.5" x2="12" y2="58" />
              </svg>
            </button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Action Widget (Shows India & Dubai Numbers on Click) */}
      <div className="floating-whatsapp-wrapper" ref={waContainerRef}>
        {waOpen && (
          <div className="floating-whatsapp__menu" role="dialog" aria-label="Choose WhatsApp Number">
            <div className="floating-whatsapp__menu-header">
              <span>Chat on WhatsApp</span>
              <button
                type="button"
                className="floating-whatsapp__menu-close"
                onClick={() => setWaOpen(false)}
                aria-label="Close WhatsApp menu"
              >
                &times;
              </button>
            </div>
            <div className="floating-whatsapp__menu-list">
              {WHATSAPP_NUMBERS.map((item) => (
                <a
                  key={item.region}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="floating-whatsapp__number-link"
                  onClick={() => setWaOpen(false)}
                >
                  <span className="floating-whatsapp__number-icon">
                    <WhatsAppIcon size={18} />
                  </span>
                  <span className="floating-whatsapp__number-info">
                    <small>{item.region}</small>
                    <strong>{item.display}</strong>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="floating-whatsapp"
          onClick={() => setWaOpen((prev) => !prev)}
          aria-expanded={waOpen}
          aria-label="Chat on WhatsApp"
          title="Chat on WhatsApp"
        >
          <span className="floating-whatsapp__pulse" aria-hidden="true" />
          <WhatsAppIcon className="floating-whatsapp__icon" size={32} />
        </button>
      </div>
    </>
  )
}

export default Footer
