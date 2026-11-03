import { useCallback, useEffect, useRef, useState } from 'react'
import './GuestSelfieCapture.css'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_SELFIE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

function validateSelfieFileClient(file) {
  if (!file) {
    return 'Please capture or choose a selfie photograph.'
  }
  const fileName = (file.name || '').toLowerCase()
  const mime = (file.type || '').toLowerCase()

  const validExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))
  const validMime = ALLOWED_MIME_TYPES.has(mime)

  if (!validExt && !validMime) {
    return 'Unsupported file format. Please select a JPEG, PNG, or WebP photograph.'
  }

  if (file.size <= 0) {
    return 'The selected image file is empty.'
  }

  if (file.size > MAX_SELFIE_SIZE_BYTES) {
    return 'The selected image exceeds the 10 MB size limit. Please choose a smaller photograph.'
  }

  return null
}

function GuestSelfieCapture({
  eventName,
  onSubmitSelfie,
  onCancel,
  isSubmitting = false,
  serverError = '',
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraShutterRef = useRef(null)

  const isSafariOrIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  )

  const hasMediaDevices = typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  const [captureMode, setCaptureMode] = useState('camera') // 'camera' | 'upload'
  const [facingMode, setFacingMode] = useState('user') // 'user' (Front) | 'environment' (Back)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // Held strictly in React memory — never written to localStorage or sessionStorage
  const [capturedFile, setCapturedFile] = useState(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState('')
  const [validationError, setValidationError] = useState('')

  // Stop all active camera tracks safely
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // Ignore track stop errors
        }
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
    setCameraStarting(false)
  }, [])

  // Clean up object URL when changing or unmounting
  const clearCapturedSelfie = useCallback(() => {
    setCapturedFile(null)
    setValidationError('')
    setPreviewObjectUrl((prevUrl) => {
      if (prevUrl) {
        window.URL.revokeObjectURL(prevUrl)
      }
      return ''
    })
  }, [])

  // Request camera stream (called via explicit user tap or mount in secure contexts)
  const startCameraStream = useCallback(
    async (requestedFacingMode) => {
      const activeFacing =
        requestedFacingMode === 'environment' || requestedFacingMode === 'user'
          ? requestedFacingMode
          : facingMode

      setCameraError('')
      setValidationError('')

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraError(
          'Direct live streaming is restricted by Safari on local HTTP. Tap "Open Safari Camera" below to take your selfie.'
        )
        return
      }

      stopCameraStream()
      setCameraStarting(true)

      try {
        let mediaStream
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: activeFacing },
              width: { ideal: 1080 },
              height: { ideal: 1080 },
            },
            audio: false,
          })
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: activeFacing },
            audio: false,
          })
        }

        streamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play().catch(() => {})
        }
        setCameraReady(true)
      } catch (err) {
        const errName = err?.name || ''
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was not granted. Tap "Take Photo with Camera" below, or allow Camera access in your browser settings.'
          )
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError(
            'No camera was found on this device. Please upload a clear selfie photograph below.'
          )
        } else {
          setCameraError(
            'Live camera is unavailable on this connection. Tap "Take Photo with Camera" below to snap your photo.'
          )
        }
      } finally {
        setCameraStarting(false)
      }
    },
    [facingMode, stopCameraStream]
  )

  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacing)
    if (captureMode === 'camera' && !capturedFile && hasMediaDevices) {
      startCameraStream(nextFacing)
    }
  }

  // On secure contexts, attempt auto-starting camera; on non-secure Safari, wait for user gesture or direct shutter
  useEffect(() => {
    if (captureMode === 'camera' && !capturedFile) {
      // In secure contexts or localhost, auto-start stream
      if (hasMediaDevices && typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost')) {
        startCameraStream()
      }
    } else {
      stopCameraStream()
    }

    return () => {
      stopCameraStream()
    }
  }, [captureMode, capturedFile, hasMediaDevices, startCameraStream, stopCameraStream])

  // Trigger the native Safari / iOS Camera viewfinder directly via capture="user"
  const handleOpenNativeCamera = () => {
    setCameraError('')
    setValidationError('')
    if (cameraShutterRef.current) {
      cameraShutterRef.current.click()
    }
  }

  // Ensure camera tracks stop if the guest switches tabs or leaves the page
  useEffect(() => {
    const handlePageHide = () => {
      stopCameraStream()
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [stopCameraStream])

  // Revoke blob preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        window.URL.revokeObjectURL(previewObjectUrl)
      }
    }
  }, [previewObjectUrl])

  const handleCaptureFrame = () => {
    const videoEl = videoRef.current
    if (!videoEl || !cameraReady) return

    const vw = videoEl.videoWidth || 720
    const vh = videoEl.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = vw
    canvas.height = vh

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setValidationError('Unable to capture frame from camera. Please use file upload.')
      return
    }

    ctx.drawImage(videoEl, 0, 0, vw, vh)

    // Immediately stop camera tracks after capturing the selfie
    stopCameraStream()

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setValidationError('Could not process captured selfie frame. Please try again.')
          return
        }
        const selfieFile = new File([blob], 'guest_selfie.jpg', {
          type: 'image/jpeg',
        })
        const checkErr = validateSelfieFileClient(selfieFile)
        if (checkErr) {
          setValidationError(checkErr)
          return
        }
        const objectUrl = window.URL.createObjectURL(selfieFile)
        setCapturedFile(selfieFile)
        setPreviewObjectUrl(objectUrl)
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        }
      },
      'image/jpeg',
      0.92
    )
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const checkErr = validateSelfieFileClient(file)
    if (checkErr) {
      setValidationError(checkErr)
      e.target.value = ''
      return
    }

    stopCameraStream()
    if (previewObjectUrl) {
      window.URL.revokeObjectURL(previewObjectUrl)
    }

    const objectUrl = window.URL.createObjectURL(file)
    setValidationError('')
    setCapturedFile(file)
    setPreviewObjectUrl(objectUrl)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
  }

  const handleRetake = () => {
    clearCapturedSelfie()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!capturedFile || isSubmitting) return

    const checkErr = validateSelfieFileClient(capturedFile)
    if (checkErr) {
      setValidationError(checkErr)
      return
    }

    onSubmitSelfie(capturedFile)
  }

  return (
    <div className="guest-selfie-capture fade-up">
      <div
        className={`guest-selfie-capture__header ${
          capturedFile ? 'guest-selfie-capture__header--compact' : ''
        }`}
      >
        <span className="section-eyebrow">Step 2 of 3 &bull; Reference Selfie</span>
        <h2 className="guest-selfie-capture__title">
          {capturedFile ? 'Review Your Selfie' : 'Capture Your Reference Selfie'}
        </h2>
        {!capturedFile && (
          <p className="guest-selfie-capture__subtitle">
            Look directly at the camera in clear lighting with only your face in the frame. Your
            selfie is analyzed in memory for <strong>{eventName}</strong> and discarded immediately
            after matching.
          </p>
        )}
      </div>

      {/* Mode Switcher */}
      {!capturedFile && (
        <div className="guest-selfie-capture__mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={captureMode === 'camera'}
            className={`guest-selfie-capture__tab ${captureMode === 'camera' ? 'is-active' : ''}`}
            onClick={() => setCaptureMode('camera')}
            disabled={isSubmitting}
          >
            Use Device Camera
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={captureMode === 'upload'}
            className={`guest-selfie-capture__tab ${captureMode === 'upload' ? 'is-active' : ''}`}
            onClick={() => setCaptureMode('upload')}
            disabled={isSubmitting}
          >
            Upload Selfie Photo
          </button>
        </div>
      )}

      {(cameraError || validationError || serverError) && (
        <div className="guest-selfie-capture__alert" role="alert">
          {validationError || serverError || cameraError}
        </div>
      )}

      {/* Hidden Native Camera Shutter Input for iOS Safari / Mobile Browsers */}
      <input
        ref={cameraShutterRef}
        id="guest-native-camera-input"
        type="file"
        accept="image/*"
        capture={facingMode}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* 1. Captured Preview State */}
      {capturedFile && previewObjectUrl ? (
        <form onSubmit={handleSubmit} className="guest-selfie-capture__preview-panel">
          <div className="guest-selfie-capture__viewport guest-selfie-capture__viewport--preview">
            <img
              src={previewObjectUrl}
              alt="Captured guest selfie preview"
              className="guest-selfie-capture__preview-img"
            />
            <span className="guest-selfie-capture__badge">Ready to Match</span>
          </div>

          <p className="guest-selfie-capture__privacy-note">
            Nothing is uploaded until you tap <strong>Find My Photographs</strong> below.
          </p>

          <div className="guest-selfie-capture__actions guest-selfie-capture__actions--preview">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Finding Your Photographs...' : 'Find My Photographs'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleRetake}
              disabled={isSubmitting}
            >
              Retake Selfie
            </button>
          </div>
        </form>
      ) : captureMode === 'camera' ? (
        /* 2. Live Camera Preview State */
        <div className="guest-selfie-capture__camera-panel">
          <div className="guest-selfie-capture__camera-topbar">
            <span className="guest-selfie-capture__camera-lens-label">
              Active Lens: <strong>{facingMode === 'user' ? 'Front Camera' : 'Back Camera'}</strong>
            </span>
            <button
              type="button"
              className="guest-selfie-capture__switch-cam-btn"
              onClick={handleToggleFacingMode}
              disabled={cameraStarting || isSubmitting}
              aria-label={
                facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'
              }
            >
              🔄 {facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
            </button>
          </div>

          <div className="guest-selfie-capture__viewport">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted
              className={`guest-selfie-capture__video ${
                facingMode === 'user' ? 'guest-selfie-capture__video--mirrored' : ''
              }`}
              style={{ display: cameraReady ? 'block' : 'none' }}
            />
            <div className="guest-selfie-capture__oval-guide" aria-hidden="true" />
            {cameraReady && (
              <button
                type="button"
                className="guest-selfie-capture__floating-flip-btn"
                onClick={handleToggleFacingMode}
                disabled={cameraStarting}
                title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
              >
                🔄 {facingMode === 'user' ? 'Back Cam' : 'Front Cam'}
              </button>
            )}
            {cameraStarting ? (
              <div className="guest-selfie-capture__overlay-msg">
                Starting {facingMode === 'user' ? 'Front' : 'Back'} Camera...
              </div>
            ) : !cameraReady ? (
              <div className="guest-selfie-capture__standby-prompt">
                <span className="guest-selfie-capture__standby-icon">📷</span>
                <strong>Camera Access ({facingMode === 'user' ? 'Front' : 'Back'})</strong>
                <p>Allow camera access or take a photo directly</p>
                <div className="guest-selfie-capture__standby-btns">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenNativeCamera}
                  >
                    📸 Open {facingMode === 'user' ? 'Front' : 'Back'} Camera
                  </button>
                  {hasMediaDevices && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => startCameraStream(facingMode)}
                    >
                      Allow Live Preview
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleToggleFacingMode}
                  >
                    🔄 Use {facingMode === 'user' ? 'Back' : 'Front'} Camera
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <ul className="guest-selfie-capture__tips">
            <li>Center your face inside the oval guide</li>
            <li>Ensure only one person is visible in the frame</li>
            <li>Remove sunglasses or heavy face coverings</li>
          </ul>

          <div className="guest-selfie-capture__safari-help">
            <strong>💡 Camera Permission Guide:</strong>
            <p>
              When prompted by your browser, tap <strong>&ldquo;Allow&rdquo;</strong> to enable camera access.
              {isSafariOrIOS && (
                <span>
                  {' '}If Safari previously blocked the camera: tap the <strong>aA</strong> icon in the address bar &gt; <strong>Website Settings</strong> &gt; set <strong>Camera</strong> to <strong>Allow</strong>.
                </span>
              )}
            </p>
          </div>

          <div className="guest-selfie-capture__actions">
            {onCancel && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  stopCameraStream()
                  onCancel()
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleToggleFacingMode}
              disabled={cameraStarting}
            >
              🔄 {facingMode === 'user' ? 'Back Camera' : 'Front Camera'}
            </button>
            {cameraReady ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCaptureFrame}
              >
                Capture Photo
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenNativeCamera}
              >
                📸 Take Photo with Camera
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 3. Fallback File Upload State */
        <div className="guest-selfie-capture__upload-panel">
          <div className="guest-selfie-capture__upload-actions-top">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenNativeCamera}
            >
              📸 Take Selfie with Camera
            </button>
          </div>

          <label htmlFor="guest-selfie-file-input" className="guest-selfie-capture__dropzone">
            <span className="guest-selfie-capture__dropzone-eyebrow">
              Choose from Photo Library
            </span>
            <strong>Select a Clear Solo Portrait</strong>
            <span>Supports JPEG, PNG, or WebP up to 10 MB</span>
            <input
              ref={fileInputRef}
              id="guest-selfie-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInputChange}
              className="guest-selfie-capture__file-input"
            />
          </label>

          <div className="guest-selfie-capture__actions">
            {onCancel && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onCancel}
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestSelfieCapture

