import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminLayout from './AdminLayout.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminOverview from './pages/AdminOverview.jsx'
import AdminEvents from './pages/AdminEvents.jsx'
import AdminGallery from './pages/AdminGallery.jsx'
import AdminPhotoSorter from './pages/AdminPhotoSorter.jsx'
import AdminQrCodes from './pages/AdminQrCodes.jsx'
import AdminRecognition from './pages/AdminRecognition.jsx'
import AdminGuestActivity from './pages/AdminGuestActivity.jsx'
import AdminAdministrators from './pages/AdminAdministrators.jsx'
import AdminChangePassword from './pages/AdminChangePassword.jsx'
import AdminAccessDenied from './components/AdminAccessDenied.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

function ModuleGuard({ moduleKey, superAdminOnly = false, title, children }) {
  const { isSuperAdmin, hasPermission } = useAuth()
  if (superAdminOnly && !isSuperAdmin) {
    return <AdminAccessDenied moduleTitle={title || 'Super Administrator Console'} />
  }
  if (moduleKey && !hasPermission(moduleKey)) {
    return <AdminAccessDenied moduleTitle={title || moduleKey} />
  }
  return children
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route
          path="events"
          element={
            <ModuleGuard moduleKey="events" title="Event Management">
              <AdminEvents />
            </ModuleGuard>
          }
        />
        <Route
          path="gallery"
          element={
            <ModuleGuard moduleKey="gallery" title="Photo Gallery Engine">
              <AdminGallery />
            </ModuleGuard>
          }
        />
        <Route
          path="photo-sorter"
          element={
            <ModuleGuard moduleKey="gallery" title="AI Photo Culling & Folder Sorter">
              <AdminPhotoSorter />
            </ModuleGuard>
          }
        />
        <Route
          path="qr-codes"
          element={
            <ModuleGuard moduleKey="qr_codes" title="Event QR Codes">
              <AdminQrCodes />
            </ModuleGuard>
          }
        />
        <Route
          path="recognition"
          element={
            <ModuleGuard moduleKey="ai_recognition" title="AI Face Recognition Engine">
              <AdminRecognition />
            </ModuleGuard>
          }
        />
        <Route
          path="guest-activity"
          element={
            <ModuleGuard moduleKey="guest_activity" title="Guest Activity & Reporting">
              <AdminGuestActivity />
            </ModuleGuard>
          }
        />
        <Route
          path="administrators"
          element={
            <ModuleGuard superAdminOnly title="Administrator Management">
              <AdminAdministrators />
            </ModuleGuard>
          }
        />
        <Route path="settings" element={<Navigate to="/admin" replace />} />
        <Route path="change-password" element={<AdminChangePassword />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default AdminRoutes
