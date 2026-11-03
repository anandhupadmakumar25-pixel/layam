import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
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
              href="https://instagram.com/layamweddingcinemas"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__ig-link"
              aria-label="Instagram @layamweddingcinemas"
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

          {/* Social Icons Row: Facebook, X, Instagram, Pinterest, YouTube, Vimeo, LinkedIn */}
          <div className="minimal-footer__socials" aria-label="Social media channels">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="Facebook"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>

            {/* X (formerly Twitter) */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="X"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/layamweddingcinemas"
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

            {/* Pinterest */}
            <a
              href="https://pinterest.com"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="Pinterest"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.057.238-.19.288-.438.173-1.636-.762-2.658-3.153-2.658-5.076 0-4.135 3.004-7.935 8.667-7.935 4.551 0 8.089 3.244 8.089 7.581 0 4.522-2.851 8.163-6.808 8.163-1.329 0-2.579-.691-3.006-1.506l-.818 3.118c-.296 1.129-1.096 2.544-1.634 3.407C9.324 23.86 10.638 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="YouTube"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* Vimeo */}
            <a
              href="https://vimeo.com"
              target="_blank"
              rel="noreferrer"
              className="minimal-footer__social-btn"
              aria-label="Vimeo"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.525 3.01 7.525c-.179 0-.806.378-1.881 1.131L0 7.271c1.171-1.025 2.324-2.053 3.456-3.084 1.558-1.378 2.684-2.109 3.379-2.193 1.636-.188 2.646.924 3.031 3.334.412 2.581.701 4.195.867 4.843.501 2.219 1.05 3.328 1.649 3.328.461 0 1.127-.726 1.996-2.181.872-1.455 1.341-2.548 1.409-3.278.14-1.264-.366-1.896-1.518-1.896-.549 0-1.125.127-1.729.378 1.122-3.666 3.253-5.447 6.394-5.342 2.329.076 3.447 1.583 3.354 4.521z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
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

          {/* Centered Scroll to Top Button (Exact Flared Arrowhead + Vertical Stem from Reference) */}
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

      {/* Floating WhatsApp Action Button (Fixed Bottom-Right, Scrolls With Screen) */}
      <a
        href="https://wa.me/919847012345?text=Hello%20Layam%20Wedding%20Cinemas,%20I%20would%20like%20to%20inquire%20about%20your%20services"
        target="_blank"
        rel="noreferrer"
        className="floating-whatsapp"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <span className="floating-whatsapp__pulse" aria-hidden="true" />
        <svg
          className="floating-whatsapp__icon"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </>
  )
}

export default Footer
