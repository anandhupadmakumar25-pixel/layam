import { Link } from 'react-router-dom'
import './EventTable.css'

function EventTable({ events, onOpenLiveHub, onView, onEdit, onDelete }) {
  if (!events || events.length === 0) {
    return (
      <div className="admin-event-empty">
        <h3>No Studio Events Found</h3>
        <p>Create your first photography event above to initialize its Smart Studio archive.</p>
      </div>
    )
  }

  return (
    <div className="admin-event-table-wrap">
      <table className="admin-event-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Location</th>
            <th>Category</th>
            <th>Photographs</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td data-label="Event Name">
                <div className="admin-event-table__primary">
                  <img
                    src={
                      event.cover_image ||
                      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={event.name}
                    className="admin-event-table__thumb"
                  />
                  <div>
                    <strong className="admin-event-table__name">{event.name}</strong>
                    <span className="admin-event-table__slug">/{event.slug}</span>
                  </div>
                </div>
              </td>
              <td data-label="Date">{event.event_date}</td>
              <td data-label="Location">{event.location}</td>
              <td data-label="Category">
                <span className="admin-event-table__cat">{event.category}</span>
              </td>
              <td data-label="Photographs">
                <strong>{event.photo_count ?? 0}</strong> frames
              </td>
              <td data-label="Status">
                <span
                  className={`admin-event-status status--${(
                    event.status || 'upcoming'
                  ).toLowerCase()}`}
                >
                  {event.status}
                </span>
              </td>
              <td data-label="Actions" className="text-right">
                <div className="admin-event-table__actions">
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--gold"
                    onClick={() => onOpenLiveHub && onOpenLiveHub(event)}
                    title="Open Live Station for instant QR placard & photo dropzone"
                  >
                    ⚡ Live Station
                  </button>
                  <Link
                    to={`/admin/gallery?event=${event.id}`}
                    className="admin-action-btn"
                  >
                    📸 Photos
                  </Link>
                  <Link
                    to={`/admin/qr-codes?event=${event.id}`}
                    className="admin-action-btn"
                  >
                    📱 QR Pass
                  </Link>
                  <Link
                    to={`/admin/guest-activity?event=${event.id}`}
                    className="admin-action-btn"
                  >
                    📊 Activity
                  </Link>
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => onEdit(event)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--danger"
                    onClick={() => onDelete(event)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EventTable
