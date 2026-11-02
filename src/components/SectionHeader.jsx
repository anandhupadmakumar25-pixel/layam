import './SectionHeader.css'

function SectionHeader({ eyebrow, title, subtitle, align = 'center', light = false }) {
  return (
    <div className={`section-header section-header--${align} ${light ? 'section-header--light' : ''}`}>
      {eyebrow && <span className="section-header__eyebrow">{eyebrow}</span>}
      <h2 className="section-header__title">{title}</h2>
      <div className="section-header__divider" />
      {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
    </div>
  )
}

export default SectionHeader

