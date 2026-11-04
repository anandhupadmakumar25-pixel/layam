import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './components/AdminSidebar.jsx'
import AdminHeader from './components/AdminHeader.jsx'
import './AdminLayout.css'

const PAGE_TITLES = {
  '/admin': 'Studio Overview',
  '/admin/events': 'Event Management',
  '/admin/gallery': 'Photo Gallery Engine',
  '/admin/photo-sorter': 'AI Photo Culling & Sorter',
  '/admin/qr-codes': 'Event QR Codes',
  '/admin/recognition': 'AI Face Recognition Engine',
  '/admin/guest-activity': 'Guest Activity Log',
  '/admin/administrators': 'Administrator Management',
  '/admin/settings': 'Studio Settings',
  '/admin/change-password': 'Credential Management',
}

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const pageTitle = PAGE_TITLES[location.pathname] || 'Studio Dashboard'

  return (
    <div className="admin-shell">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="admin-shell__main">
        <AdminHeader
          pageTitle={pageTitle}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="admin-shell__content">
          <Outlet />
        </main>
        <footer className="admin-footer">
          <p>All content Copyright &copy; 2026 Layam Wedding Cinemas.</p>
        </footer>
      </div>
    </div>
  )
}

export default AdminLayout
