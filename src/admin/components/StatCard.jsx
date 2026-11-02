import './StatCard.css'

function StatCard({ label, value, subtitle, source = 'live' }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-card__top">
        <span className="admin-stat-card__label">{label}</span>
        <span
          className={`admin-stat-card__badge ${
            source === 'live' ? 'is-live' : 'is-sample'
          }`}
        >
          {source === 'live' ? 'Live DB' : 'Sample Preview'}
        </span>
      </div>
      <div className="admin-stat-card__value">{value}</div>
      {subtitle && <p className="admin-stat-card__sub">{subtitle}</p>}
    </article>
  )
}

export default StatCard

