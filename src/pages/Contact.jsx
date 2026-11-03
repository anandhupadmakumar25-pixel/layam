import { useState } from 'react'
import './Contact.css'

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  serviceType: 'Wedding Shoots',
  eventDate: '',
  location: '',
  message: '',
}

function Contact() {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const handleReset = () => {
    setFormData(INITIAL_FORM)
    setSubmitted(false)
  }

  return (
    <div className="contact-page">
      {/* Hero */}
      <section className="contact-hero">
        <div className="container contact-hero__inner fade-up">
          <span className="contact-hero__eyebrow">Private Concierge</span>
          <h1 className="contact-hero__title">Enquire &amp; Reserve</h1>
          <p className="contact-hero__subtitle">
            Share the details of your upcoming celebration, portrait session, or brand commission.
            Our team responds to all enquiries within 24 hours.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="contact-section">
        <div className="container contact-section__grid">
          {/* Left Column: Atelier Details */}
          <aside className="contact-info">
            <div className="contact-info__card">
              <span className="contact-info__eyebrow">Studio &amp; Office</span>
              <h2>Layam Wedding Cinemas</h2>
              <p className="contact-info__lead">
                Private consultations and portrait sessions are hosted by appointment at our studio or on location.
              </p>

              <div className="contact-info__list">
                <div className="contact-info__item">
                  <span className="contact-info__label">Address</span>
                  <p>Layam Studio Kolenchery , Kochi , Kerala.</p>
                </div>

                <div className="contact-info__item">
                  <span className="contact-info__label">Email</span>
                  <p>
                    <a href="mailto:layamstudiokolenchery@gmail.com">layamstudiokolenchery@gmail.com</a>
                  </p>
                </div>

                <div className="contact-info__item">
                  <span className="contact-info__label">Telephone</span>
                  <p>
                    <a href="tel:+919744860510">+91 9744860510</a>
                  </p>
                </div>
              </div>

              <div className="contact-info__image-wrap">
                <img
                  src="/layam-studio-office.jpg"
                  alt="Layam Wedding Cinemas Studio Kolenchery"
                  className="contact-info__img"
                />
              </div>
            </div>
          </aside>

          {/* Right Column: Bespoke Inquiry Form */}
          <div className="contact-form-wrap">
            {submitted ? (
              <div className="contact-confirmation">
                <span className="contact-confirmation__badge">Enquiry Received</span>
                <h2>Thank You, {formData.fullName}</h2>
                <p>
                  We have registered your enquiry for a <strong>{formData.serviceType}</strong>
                  {formData.location ? ` in ${formData.location}` : ''}. Our team will
                  contact you at <strong>{formData.email}</strong> within one business day with our
                  availability and bespoke details.
                </p>
                <button type="button" className="btn btn-outline" onClick={handleReset}>
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <h2 className="contact-form__title">Get In Touch</h2>
                <p className="contact-form__subtitle">
                  Please complete the fields below so we may connect with you.
                </p>

                <div className="contact-form__row">
                  <div className="contact-form__field">
                    <label htmlFor="fullName">Full Name *</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="e.g. Clara Laurent"
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="contact-form__field">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="clara@domain.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="contact-form__row">
                  <div className="contact-form__field">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 9744860510"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="contact-form__field">
                    <label htmlFor="serviceType">Commission Type *</label>
                    <select
                      id="serviceType"
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                    >
                      <option value="Wedding Shoots">Wedding Shoots</option>
                      <option value="Engagement Shoots">Engagement Shoots</option>
                      <option value="Brand Concept Shoots">Brand Concept Shoots</option>
                      <option value="Corporate Events">Corporate Events</option>
                      <option value="Moments & Celebrations">Moments &amp; Celebrations</option>
                    </select>
                  </div>
                </div>

                <div className="contact-form__row">
                  <div className="contact-form__field">
                    <label htmlFor="eventDate">Proposed Date(s)</label>
                    <input
                      id="eventDate"
                      name="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="contact-form__field">
                    <label htmlFor="location">Venue or City</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      placeholder="e.g. Kochi, Kerala"
                      value={formData.location}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="contact-form__field">
                  <label htmlFor="message">Tell Us About Your Vision *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    required
                    placeholder="Share your aesthetic preferences, schedule, estimated guest count, or creative goals..."
                    value={formData.message}
                    onChange={handleChange}
                  />
                </div>

                <button type="submit" className="btn btn-primary contact-form__submit">
                  Send Private Enquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Contact
