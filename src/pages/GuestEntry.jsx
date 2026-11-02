import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GuestSelfieCapture from '../components/GuestSelfieCapture.jsx'
import GuestMatchingResults from '../components/GuestMatchingResults.jsx'
import {
  fetchGuestMatchedResults,
  submitGuestConsent,
  submitGuestSelfieForMatching,
  verifyGuestQrToken,
} from '../services/api.js'
import './GuestEntry.css'

function formatEventDate(dateString) {
  if (!dateString) return ''
  const parsed = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateString
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function GuestEntry() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [verification, setVerification] = useState(null)
  const [errorState, setErrorState] = useState(null)

  // Step state: 'consent' | 'declined' | 'capture' | 'results'
  const [step, setStep] = useState('consent')

  // Unchecked explicit consent controls (never preselected)
  // Pathway distinguishes 'adult_self' (18+ confirming own age) from 'guardian_minor'
  // (parent/legal guardian self-attestation for a minor; does not independently verify identity)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentPathway, setConsentPathway] = useState('')
  const [guardianChecked, setGuardianChecked] = useState(false)
  const [consentSubmitting, setConsentSubmitting] = useState(false)
  const [consentError, setConsentError] = useState('')

  // Selfie matching state (session authentication uses HttpOnly cookie only — no raw token in React state)
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [matchData, setMatchData] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function validateToken() {
      setLoading(true)
      setErrorState(null)
      setVerification(null)
      setStep('consent')
      setConsentChecked(false)
      setConsentPathway('')
      setGuardianChecked(false)
      setMatchData(null)

      if (!token) {
        if (isMounted) {
          setErrorState({
            code: 'missing_token',
            title: 'Invalid QR Code',
            detail: 'No event access token was provided in this QR link.',
          })
          setLoading(false)
        }
        return
      }

      try {
        const data = await verifyGuestQrToken(token)
        if (isMounted) {
          setVerification(data)
        }
      } catch (err) {
        if (isMounted) {
          const code = err.payload?.code || 'invalid_token'
          let title = 'Invalid QR Code'
          if (code === 'qr_deactivated') {
            title = 'This QR Code Has Been Deactivated'
          } else if (code === 'qr_revoked') {
            title = 'QR Code Replaced by Organizer'
          } else if (code === 'event_unavailable') {
            title = 'This Event Is No Longer Available'
          }
          setErrorState({
            code,
            title,
            detail:
              err.message ||
              'This QR code is not valid or has been deactivated by the studio administrator.',
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    validateToken()
    return () => {
      isMounted = false
    }
  }, [token])

  const eventInfo = verification?.event || null
  const recognitionInfo = verification?.recognition || null
  const isRecognitionAvailable = Boolean(recognitionInfo?.available)
  const sessionTtlMinutes = recognitionInfo?.session_ttl_minutes ?? 60

  const handleAcceptConsent = async (e) => {
    e.preventDefault()
    if (
      !consentChecked ||
      !guardianChecked ||
      (consentPathway !== 'adult_self' && consentPathway !== 'guardian_minor') ||
      consentSubmitting
    ) {
      return
    }

    setConsentSubmitting(true)
    setConsentError('')
    try {
      await submitGuestConsent(token, {
        consentAccepted: true,
        consentPathway,
        ageOrGuardianConfirmed: true,
        consentNoticeVersion: verification?.consent_notice_version || '2026.01-DPDP-v2',
      })
      setStep('capture')
    } catch (err) {
      setConsentError(
        err.message || 'Unable to record consent right now. Please try again.'
      )
    } finally {
      setConsentSubmitting(false)
    }
  }

  const handleDeclineConsent = async () => {
    setConsentSubmitting(true)
    setConsentError('')
    try {
      await submitGuestConsent(token, {
        consentAccepted: false,
        consentPathway: 'declined',
        ageOrGuardianConfirmed: false,
        consentNoticeVersion: verification?.consent_notice_version || '2026.01-DPDP-v2',
      })
    } catch {
      // Even if recording decline fails over network, respect guest's decline immediately
    } finally {
      setConsentChecked(false)
      setConsentPathway('')
      setGuardianChecked(false)
      setConsentSubmitting(false)
      setStep('declined')
    }
  }

  const handleSubmitSelfie = async (selfieFile) => {
    setMatchLoading(true)
    setMatchError('')
    try {
      const res = await submitGuestSelfieForMatching(token, selfieFile)
      setMatchData(res)
      setStep('results')
    } catch (err) {
      const code = err.payload?.code || ''
      if (
        code === 'session_expired' ||
        code === 'session_revoked' ||
        code === 'invalid_session' ||
        code === 'session_required'
      ) {
        setConsentChecked(false)
        setConsentPathway('')
        setGuardianChecked(false)
        setConsentError(
          err.message || 'Your guest session has expired. Please re-confirm consent to continue.'
        )
        setStep('consent')
      } else {
        setMatchError(
          err.message ||
            'Unable to analyze your selfie. Please try another clear selfie looking directly at the camera.'
        )
      }
    } finally {
      setMatchLoading(false)
    }
  }

  const handleRefreshPreviews = async () => {
    setMatchLoading(true)
    setMatchError('')
    try {
      const refreshed = await fetchGuestMatchedResults(token)
      setMatchData((prev) => ({
        ...(prev || {}),
        ...refreshed,
      }))
    } catch (err) {
      setMatchError(err.message || 'Unable to refresh photograph previews.')
    } finally {
      setMatchLoading(false)
    }
  }

  return (
    <div className="guest-entry-page">
      <div className="container guest-entry__container">
        <div className="guest-entry__brand-logo">
          <Link to="/">
            <img
              src="/layam-logo.png"
              alt="Layam Wedding Cinemas"
              className="guest-entry__logo-img"
            />
          </Link>
        </div>
        {loading ? (
          <div className="guest-entry-card guest-entry-card--loading fade-up">
            <span className="section-eyebrow">Layam Wedding Cinemas Guest Concierge</span>
            <h1 className="guest-entry__title">Verifying Event Access Pass...</h1>
            <p className="guest-entry__subtitle">
              Authenticating your cryptographic event QR token with the Layam Wedding Cinemas archive.
            </p>
          </div>
        ) : errorState ? (
          <div className="guest-entry-card guest-entry-card--error fade-up" role="alert">
            <span className="guest-entry__status-pill guest-entry__status-pill--error">
              Access Unavailable
            </span>
            <h1 className="guest-entry__title">{errorState.title}</h1>
            <p className="guest-entry__subtitle">{errorState.detail}</p>

            <div className="guest-entry__error-guidance">
              <p>
                If you scanned a table card at an event, please check with the event host or Layam
                Wedding Cinemas photography concierge for the latest active QR pass.
              </p>
            </div>

            <div className="guest-entry__actions">
              <Link to="/" className="btn btn-primary">
                Return to Layam Wedding Cinemas Home
              </Link>
              <Link to="/contact" className="btn btn-outline">
                Contact Studio Concierge
              </Link>
            </div>
          </div>
        ) : (
          <div className="guest-entry-card fade-up">
            {/* Event Header Banner */}
            <div className="guest-entry__header">
              <span className="guest-entry__status-pill guest-entry__status-pill--valid">
                Verified Event Guest Pass
              </span>
              <span className="section-eyebrow" style={{ marginTop: '1rem' }}>
                {eventInfo?.category || 'Private Studio Collection'}
              </span>
              <h1 className="guest-entry__title">{eventInfo?.name}</h1>
              <p className="guest-entry__meta">
                {formatEventDate(eventInfo?.event_date)}
                {eventInfo?.location ? ` • ${eventInfo.location}` : ''}
              </p>
            </div>

            <div className="gold-divider" />

            {/* Case A: Recognition Not Ready or Temporarily Disabled for this Event */}
            {!isRecognitionAvailable ? (
              <div className="guest-entry__unavailable-box" role="status">
                <span className="guest-entry__consent-eyebrow">
                  {recognitionInfo?.status_code === 'recognition_not_ready'
                    ? 'Photo Recognition Is Not Yet Ready'
                    : 'Recognition Temporarily Unavailable'}
                </span>
                <h2>
                  {recognitionInfo?.status_code === 'recognition_not_ready'
                    ? 'Event Photographs Are Still Being Prepared'
                    : 'Smart Photo Discovery Is Currently Paused'}
                </h2>
                <p>
                  {recognitionInfo?.status_message ||
                    'Photo recognition is not yet ready for this event. Please check back once the studio completes indexing.'}
                </p>
                <div className="guest-entry__footer-links" style={{ marginTop: '1.75rem' }}>
                  <Link to="/" className="btn btn-outline">
                    Explore Layam Wedding Cinemas
                  </Link>
                  <Link to="/contact" className="btn btn-outline">
                    Contact Studio Concierge
                  </Link>
                </div>
              </div>
            ) : step === 'declined' ? (
              /* Case B: Guest Explicitly Declined Consent */
              <div className="guest-entry__declined-box fade-up">
                <span className="guest-entry__consent-eyebrow">Consent Declined</span>
                <h2>You Have Declined Biometric Photo Matching</h2>
                <p>
                  We respect your privacy choice. Your camera was not activated, and no selfie or
                  biometric data was captured or processed.
                </p>
                <p>
                  If you would like assistance locating your event photographs without AI face
                  recognition, please reach out to our studio concierge team.
                </p>
                <div className="guest-entry__actions" style={{ marginTop: '1.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setStep('consent')}
                  >
                    Review Consent Notice Again
                  </button>
                  <Link to="/contact" className="btn btn-primary">
                    Contact Studio Concierge
                  </Link>
                </div>
              </div>
            ) : step === 'consent' ? (
              /* Case C: Step 1 — Dedicated Privacy & Biometric Consent Screen */
              <form onSubmit={handleAcceptConsent} className="guest-entry__consent-form">
                <div className="guest-entry__welcome">
                  <span className="section-eyebrow">Step 1 of 3 &bull; Privacy &amp; Consent</span>
                  <h2>Find Your Event Photographs Privately</h2>
                  <p>
                    {verification?.welcome_message ||
                      `Welcome to the official Layam Wedding Cinemas guest portal for ${eventInfo?.name}.`}
                  </p>
                </div>

                {consentError && (
                  <div className="guest-entry__inline-error" role="alert">
                    {consentError}
                  </div>
                )}

                <div className="guest-entry__consent-box">
                  <span className="guest-entry__consent-eyebrow">
                    Biometric Privacy &amp; Data Protection Notice (
                    {verification?.consent_notice_version || '2026.01-DPDP-v1'})
                  </span>
                  <h3>How Your Selfie Is Used &amp; Protected</h3>
                  <p>
                    Before you decide whether to continue, please read how Layam Wedding Cinemas processes
                    your reference selfie:
                  </p>

                  <ul className="guest-entry__privacy-list">
                    <li>
                      <strong>Why we ask for a selfie:</strong> Event photographs are kept private
                      so strangers cannot browse the full gallery. Your selfie is used solely to
                      locate photographs from <strong>{eventInfo?.name}</strong> in which you may
                      appear.
                    </li>
                    <li>
                      <strong>What biometric data is generated:</strong> Our AI engine detects your
                      face in memory and computes a temporary numerical facial feature vector (128-D
                      embedding) to compare strictly against indexed photographs from this event.
                    </li>
                    <li>
                      <strong>Your selfie &amp; embedding are never stored:</strong> Your uploaded
                      selfie and temporary guest face embedding are processed in memory only and
                      <strong> immediately discarded</strong> as soon as matching finishes. They are
                      never saved to disk or cloud storage.
                    </li>
                    <li>
                      <strong>Session &amp; audit retention:</strong> An encrypted session reference
                      and your consent record are retained for up to{' '}
                      <strong>{sessionTtlMinutes} minutes</strong> for your active preview session
                      (and minimal non-biometric audit logs are retained per studio policy).
                    </li>
                    <li>
                      <strong>Right to decline or request deletion:</strong> Participation is
                      completely voluntary. You may decline below at any time, or contact our
                      studio privacy desk via our <Link to="/contact">Contact Page</Link> regarding
                      privacy or deletion requests.
                    </li>
                  </ul>

                  {/* Explicit Consent Pathway Selection & Unchecked Checkboxes */}
                  <div className="guest-entry__checkbox-stack">
                    <div
                      className="guest-entry__pathway-group"
                      role="radiogroup"
                      aria-label="Select Adult or Parent/Guardian Consent Pathway"
                    >
                      <span className="guest-entry__pathway-title">
                        1. Select Your Consent Pathway (Required):
                      </span>

                      <label className="guest-entry__checkbox-row">
                        <input
                          type="radio"
                          name="consent_pathway"
                          value="adult_self"
                          checked={consentPathway === 'adult_self'}
                          onChange={() => {
                            setConsentPathway('adult_self')
                            setGuardianChecked(true)
                          }}
                        />
                        <span>
                          <strong>Adult Guest (18+):</strong> I confirm that I am at least{' '}
                          <strong>18 years of age</strong> and I am consenting on my own behalf.
                        </span>
                      </label>

                      <label className="guest-entry__checkbox-row">
                        <input
                          type="radio"
                          name="consent_pathway"
                          value="guardian_minor"
                          checked={consentPathway === 'guardian_minor'}
                          onChange={() => {
                            setConsentPathway('guardian_minor')
                            setGuardianChecked(false)
                          }}
                        />
                        <span>
                          <strong>Parent or Legal Guardian for a Minor:</strong> I am the parent or
                          lawful guardian consenting on behalf of a minor guest (under 18).
                        </span>
                      </label>
                    </div>

                    {consentPathway === 'guardian_minor' && (
                      <div className="guest-entry__guardian-notice">
                        <strong>Important Notice on Guardian Consent:</strong> Selecting this option
                        records your self-attestation only; this form does not independently verify
                        legal guardian identity. Verifyable guardian consent procedures require legal
                        review before processing minors&apos; biometric data in production.
                        <label className="guest-entry__checkbox-row" style={{ marginTop: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={guardianChecked}
                            onChange={(e) => setGuardianChecked(e.target.checked)}
                          />
                          <span>
                            I confirm that I am the lawful parent or legal guardian authorized to
                            grant biometric processing consent for this minor guest.
                          </span>
                        </label>
                      </div>
                    )}

                    <span className="guest-entry__pathway-title">
                      2. Explicit Biometric Processing Consent (Required):
                    </span>

                    <label className="guest-entry__checkbox-row">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                      />
                      <span>
                        I have read the Privacy Notice and <strong>explicitly consent</strong> to
                        Layam Wedding Cinemas processing my selfie using AI face recognition solely to find
                        my photographs from <strong>{eventInfo?.name}</strong>.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="guest-entry__actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleDeclineConsent}
                    disabled={consentSubmitting}
                  >
                    Decline &amp; Exit
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      !consentChecked ||
                      !guardianChecked ||
                      (consentPathway !== 'adult_self' && consentPathway !== 'guardian_minor') ||
                      consentSubmitting
                    }
                  >
                    {consentSubmitting
                      ? 'Recording Consent...'
                      : 'I Consent — Continue to Selfie Capture'}
                  </button>
                </div>
              </form>
            ) : step === 'capture' ? (
              /* Case D: Step 2 — Camera / File Selfie Capture (Only mounted after consent) */
              <GuestSelfieCapture
                eventName={eventInfo?.name}
                onSubmitSelfie={handleSubmitSelfie}
                onCancel={() => {
                  setMatchError('')
                  setStep('consent')
                }}
                isSubmitting={matchLoading}
                serverError={matchError}
              />
            ) : (
              /* Case E: Step 3 — Matched Event Photographs Preview & Secure Download Grid */
              <GuestMatchingResults
                qrToken={token}
                eventInfo={eventInfo}
                matchData={matchData}
                loading={matchLoading}
                error={matchError}
                onRetakeSelfie={() => {
                  setMatchError('')
                  setStep('capture')
                }}
                onRefreshPreviews={handleRefreshPreviews}
                onSessionExpired={(message) => {
                  setConsentChecked(false)
                  setConsentPathway('')
                  setGuardianChecked(false)
                  setConsentError(
                    message ||
                      'Your guest session has expired. Please re-confirm consent to continue downloading your photographs.'
                  )
                  setStep('consent')
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GuestEntry
