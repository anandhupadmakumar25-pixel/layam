import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import './Navbar.css'

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Services & Packages', path: '/services' },
  { label: 'Portfolio', path: '/events' },
  { label: 'Contact', path: '/contact' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="studio-navbar">
      <div className="container studio-navbar__inner">
        <Link to="/" className="studio-logo" onClick={closeMenu}>
          <img
            src="/layam-logo.png"
            alt="Layam Wedding Cinemas"
            className="studio-logo__img"
          />
        </Link>

        <nav className={`studio-navbar__nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary Navigation">
          <ul className="studio-navbar__list">
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className="studio-navbar__item">
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `studio-navbar__link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={closeMenu}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="studio-navbar__actions">
          <button
            type="button"
            className={`studio-navbar__toggle ${menuOpen ? 'is-active' : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span className="studio-navbar__bar" />
            <span className="studio-navbar__bar" />
            <span className="studio-navbar__bar" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar

