import { Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Services from './pages/Services.jsx'
import FeaturedEvents from './pages/FeaturedEvents.jsx'
import Contact from './pages/Contact.jsx'
import GuestEntry from './pages/GuestEntry.jsx'
import AdminRoutes from './admin/AdminRoutes.jsx'
import './App.css'

function PublicLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Admin Dashboard & Login Routes */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Public Photography Studio Website Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/events" element={<FeaturedEvents />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/guest/:token" element={<GuestEntry />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
