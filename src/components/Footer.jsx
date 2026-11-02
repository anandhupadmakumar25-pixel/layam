import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="studio-footer">
      <div className="container">
        <div className="studio-footer__grid">
          {/* Brand Column */}
          <div className="studio-footer__brand">
            <Link to="/" className="studio-footer__logo">
              <img
                src="/layam-logo.png"
                alt="Layam Wedding Cinemas"
                className="studio-footer__logo-img"
              />
            </Link>
            <p className="studio-footer__desc">
              A premier luxury wedding cinema and fine art photography house capturing heartfelt
              celebrations with timeless cinematic vision and intelligent guest delivery.
            </p>
            <div className="studio-footer__luxury-tag">
              <span className="studio-footer__luxury-star">★</span>
              <span>Global Destination Wedding Cinematography</span>
            </div>
          </div>

          {/* Navigation Column */}
          <div className="studio-footer__col">
            <h3 className="studio-footer__heading">Navigation</h3>
            <ul className="studio-footer__links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/about">About the Studio</Link>
              </li>
              <li>
                <Link to="/services">Cinematography &amp; Photography</Link>
              </li>
              <li>
                <Link to="/events">Featured Events</Link>
              </li>
              <li>
                <Link to="/contact">Private Inquiry</Link>
              </li>
              <li>
                <Link to="/admin/login" className="studio-footer__portal-link">
                  <span>🔐 Staff &amp; Studio Login</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="studio-footer__col">
            <h3 className="studio-footer__heading">Studio &amp; Contact</h3>
            <ul className="studio-footer__contact">
              <li>
                <span className="studio-footer__label">Showroom</span>
                <span>482 Mercer Street, Suite 4B, New York, NY 10013</span>
              </li>
              <li>
                <span className="studio-footer__label">Direct Line</span>
                <a href="tel:+12125550194">+1 (212) 555-0194</a>
              </li>
              <li>
                <span className="studio-footer__label">Concierge</span>
                <a href="mailto:contact@layamweddingcinemas.com">contact@layamweddingcinemas.com</a>
              </li>
              <li>
                <span className="studio-footer__label">Hours</span>
                <span>Tue – Sat: 10:00 AM – 7:00 PM (By Appointment)</span>
              </li>
            </ul>
          </div>

          {/* Social Column */}
          <div className="studio-footer__col">
            <h3 className="studio-footer__heading">Social &amp; Journals</h3>
            <p className="studio-footer__social-note">
              Follow our seasonal editorials, behind-the-scenes medium format studies, and international dispatches.
            </p>
            <div className="studio-footer__socials">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="studio-footer__social-pill"
              >
                Instagram
              </a>
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
                className="studio-footer__social-pill"
              >
                Pinterest
              </a>
              <a
                href="https://behance.net"
                target="_blank"
                rel="noreferrer"
                className="studio-footer__social-pill"
              >
                Behance
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="studio-footer__social-pill"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className="studio-footer__bottom">
          <p>&copy; {new Date().getFullYear()} Layam Wedding Cinemas. All rights reserved.</p>
          <p className="studio-footer__credit">
            Layam Wedding Cinemas &bull; Fine Art Wedding Cinematography &bull; Intelligent Archive Platform
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

