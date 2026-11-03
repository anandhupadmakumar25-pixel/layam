function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured && configured.trim() && !configured.includes('trycloudflare.com')) {
    return configured.trim().replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:8000/api'
    }
    return `${origin}/api`
  }
  return 'https://layamweddings.com/api'
}

export const API_BASE_URL = resolveApiBaseUrl()
const TOKEN_STORAGE_KEY = 'smart_studio_admin_token'
let latestGuestCsrfToken = null

export async function getApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health/`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

function getCsrfToken() {
  if (latestGuestCsrfToken) return latestGuestCsrfToken
  if (typeof document === 'undefined' || !document.cookie) return ''
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token) {
  if (typeof window === 'undefined') return
  if (token) {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

function buildHeaders(includeAuth = true, isJson = true) {
  const headers = {}
  if (isJson) {
    headers['Content-Type'] = 'application/json'
  }
  if (includeAuth) {
    const token = getStoredToken()
    if (token) {
      headers.Authorization = `Token ${token}`
    }
  }
  return headers
}

async function handleResponse(response) {
  let payload = null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    payload = await response.json()
  }

  if (!response.ok) {
    const error = new Error(
      payload?.detail || 'An unexpected error occurred while communicating with the studio API.'
    )
    error.status = response.status
    error.fieldErrors = payload?.errors || payload || {}
    error.payload = payload
    throw error
  }

  return payload
}

/* Authentication Endpoints */
export async function loginAdmin(identifier, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: buildHeaders(false),
    body: JSON.stringify({ identifier, password }),
  })
  return handleResponse(response)
}

export async function logoutAdmin() {
  const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function fetchAdminProfile() {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function changeAdminPassword({ currentPassword, newPassword, confirmPassword }) {
  const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  })
  return handleResponse(response)
}

/* Super Admin Administrator Management Endpoints */
export async function fetchAdministrators() {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function createAdministrator(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function fetchAdministratorDetail(adminId) {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/${adminId}/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function updateAdministrator(adminId, payload) {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/${adminId}/`, {
    method: 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function activateAdministrator(adminId) {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/${adminId}/activate/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function deactivateAdministrator(adminId) {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/${adminId}/deactivate/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function resetAdministratorPassword(adminId, payload) {
  const response = await fetch(`${API_BASE_URL}/auth/administrators/${adminId}/reset-password/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function fetchAdministratorAuditLogs(params = {}) {
  const query = buildQueryString(params)
  const response = await fetch(`${API_BASE_URL}/auth/administrators/audit-logs/${query}`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

/* Events & Dashboard Endpoints */
export async function fetchDashboardStats() {
  const response = await fetch(`${API_BASE_URL}/events/stats/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function fetchEvents({ forSelector = false } = {}) {
  const query = forSelector ? '?selector=true' : ''
  const response = await fetch(`${API_BASE_URL}/events/${query}`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function createEvent(eventData) {
  const response = await fetch(`${API_BASE_URL}/events/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(eventData),
  })
  return handleResponse(response)
}

export async function updateEvent(eventId, eventData) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/`, {
    method: 'PUT',
    headers: buildHeaders(true),
    body: JSON.stringify(eventData),
  })
  return handleResponse(response)
}

export async function deleteEvent(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/`, {
    method: 'DELETE',
    headers: buildHeaders(true),
  })
  if (response.status === 204) return true
  return handleResponse(response)
}

function compressImageForCover(file, maxDimension = 1600, quality = 0.86) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width <= maxDimension && height <= maxDimension && file.size <= 600 * 1024) {
        resolve(file)
        return
      }
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const baseName = (file.name || 'event-cover').replace(/\.[^.]+$/, '')
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}

function xhrUploadFormData(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.min(98, Math.round((ev.loaded / ev.total) * 100)))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid JSON response from cloud image server.'))
        }
      } else {
        reject(new Error(`Cloud upload failed with status ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error while uploading cover image to cloud.'))
    xhr.send(formData)
  })
}

export async function uploadCoverImageToCloud(file, onProgress) {
  if (!file) {
    throw new Error('Please select an image file to upload.')
  }
  if (typeof onProgress === 'function') onProgress(5)

  const optimizedFile = await compressImageForCover(file)
  const safeName =
    (optimizedFile.name || 'cover.jpg').replace(/[^a-zA-Z0-9._-]/g, '_') || 'cover.jpg'

  // 1. Optional ImgBB API key if configured in environment
  const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY
  if (imgbbKey && imgbbKey.trim()) {
    try {
      const fd = new FormData()
      fd.append('image', optimizedFile, safeName)
      const res = await xhrUploadFormData(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbKey.trim())}`,
        fd,
        onProgress
      )
      if (res?.data?.url) {
        if (typeof onProgress === 'function') onProgress(100)
        return res.data.url
      }
    } catch {
      // Fall through to default cloud CDN
    }
  }

  // 2. Primary Cloud CDN (Uploadcare CDN)
  try {
    const pubKey = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || 'demopublickey'
    const fd = new FormData()
    fd.append('UPLOADCARE_PUB_KEY', pubKey)
    fd.append('UPLOADCARE_STORE', '1')
    fd.append('file', optimizedFile, safeName)
    const res = await xhrUploadFormData('https://upload.uploadcare.com/base/', fd, onProgress)
    if (res?.file) {
      if (typeof onProgress === 'function') onProgress(100)
      return `https://ucarecdn.com/${res.file}/${safeName}`
    }
  } catch {
    // Fall through to backup cloud CDN
  }

  // 3. Fallback Cloud Host (tmpfiles CDN direct link)
  const fallbackFd = new FormData()
  fallbackFd.append('file', optimizedFile, safeName)
  const fallbackRes = await xhrUploadFormData(
    'https://tmpfiles.org/api/v1/upload',
    fallbackFd,
    onProgress
  )
  const rawUrl = fallbackRes?.data?.url
  if (rawUrl) {
    if (typeof onProgress === 'function') onProgress(100)
    return rawUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/')
  }

  throw new Error('Unable to upload cover image to cloud. Please try again or paste a direct URL.')
}

/* Photo Gallery Endpoints (Phase 4) */
export async function fetchEventPhotos(
  eventId,
  { page = 1, pageSize = 24, search = '', ordering = '-uploaded_at' } = {}
) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (search && search.trim()) {
    params.set('search', search.trim())
  }
  if (ordering) {
    params.set('ordering', ordering)
  }

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/photos/?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

function uploadChunkWithProgress(eventId, filesChunk, onChunkProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    filesChunk.forEach((file) => {
      formData.append('photos', file)
    })

    xhr.open('POST', `${API_BASE_URL}/events/${eventId}/photos/upload/`)
    const token = getStoredToken()
    if (token) {
      xhr.setRequestHeader('Authorization', `Token ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onChunkProgress === 'function') {
        onChunkProgress(event.loaded, event.total)
      }
    }

    xhr.onload = () => {
      let payload = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload)
      } else if (xhr.status === 400 && payload && Array.isArray(payload.failed)) {
        resolve(payload)
      } else {
        const err = new Error(payload?.detail || `Upload failed with status ${xhr.status}`)
        err.status = xhr.status
        err.payload = payload
        reject(err)
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error while uploading photographs.'))
    }

    xhr.send(formData)
  })
}

function canvasToJpegBlob(img, targetWidth, targetHeight, quality) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      canvas.width = 0
      canvas.height = 0
      resolve(null)
      return
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
    canvas.toBlob(
      (blob) => {
        // Immediately release canvas backing store RAM
        canvas.width = 0
        canvas.height = 0
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })
}

export async function smartCompressGalleryPhoto(file) {
  const SKIP_BELOW_BYTES = 6 * 1024 * 1024 // <= 6 MB: already compressed, upload untouched
  const MAX_TARGET_BYTES = Math.floor(9.5 * 1024 * 1024) // Strictly below 10 MB

  if (!file || !file.size || file.size <= SKIP_BELOW_BYTES) {
    return file
  }

  const isCompressibleImage =
    (file.type && /^image\/(jpe?g|png|webp)$/i.test(file.type)) ||
    /\.(jpe?g|png|webp)$/i.test(file.name || '')
  if (!isCompressibleImage) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)
      try {
        const origW = img.naturalWidth || img.width
        const origH = img.naturalHeight || img.height
        if (!origW || !origH) {
          resolve(file)
          return
        }

        // Smart Guard: Check bytes-per-megapixel to avoid re-compressing already compressed images <= 10 MB
        const megapixels = (origW * origH) / 1_000_000
        const mbPerMp = file.size / (1024 * 1024) / Math.max(0.5, megapixels)
        if (file.size <= MAX_TARGET_BYTES && mbPerMp < 0.38) {
          resolve(file)
          return
        }

        // Pass 1: Archival high-clarity pass (up to 5500px long edge @ 92% quality)
        const attempts = [
          { maxDim: 5500, quality: 0.92 },
          { maxDim: 4600, quality: 0.88 },
          { maxDim: 3840, quality: 0.84 },
        ]

        let selectedBlob = null
        for (const step of attempts) {
          let w = origW
          let h = origH
          if (Math.max(w, h) > step.maxDim) {
            const scale = step.maxDim / Math.max(w, h)
            w = Math.round(w * scale)
            h = Math.round(h * scale)
          }

          const blob = await canvasToJpegBlob(img, w, h, step.quality)
          if (!blob) break
          selectedBlob = blob
          if (blob.size <= MAX_TARGET_BYTES) {
            break
          }
        }

        if (!selectedBlob) {
          resolve(file)
          return
        }

        // Minimum Savings Guard: If original was already <= 10 MB and compression saved < 20%, keep original untouched
        if (file.size <= MAX_TARGET_BYTES && selectedBlob.size > file.size * 0.8) {
          resolve(file)
          return
        }

        // Preserve original base filename with .jpg extension
        const baseName = (file.name || 'photograph').replace(/\.[^.]+$/, '')
        const extMatch = (file.name || '').match(/\.(jpe?g)$/i)
        const finalName = extMatch ? file.name : `${baseName}.jpg`

        const compressedFile = new File([selectedBlob], finalName, {
          type: 'image/jpeg',
          lastModified: file.lastModified || Date.now(),
        })
        resolve(compressedFile)
      } catch {
        resolve(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export async function uploadEventPhotos(eventId, files, onProgress) {
  const CHUNK_SIZE = 2
  const CONCURRENCY = 2
  const totalFiles = files.length

  const chunks = []
  for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
    chunks.push({
      index: i,
      files: files.slice(i, i + CHUNK_SIZE),
    })
  }

  let uploadedAll = []
  let failedAll = []
  let latestEventPhotoCount = null
  let completedFiles = 0
  let highestPercent = 0

  const chunkProgressMap = new Map()

  function updateGlobalProgress() {
    if (typeof onProgress !== 'function' || totalFiles <= 0) return
    let activeFilesEquivalent = 0
    chunkProgressMap.forEach(({ loaded, total, fileCount }) => {
      if (total > 0 && fileCount > 0) {
        const chunkRatio = Math.min(1, Math.max(0, loaded / total))
        activeFilesEquivalent += chunkRatio * fileCount
      }
    })

    const totalProgressRatio = (completedFiles + activeFilesEquivalent) / totalFiles
    const rawPercent = Math.min(99, Math.round(totalProgressRatio * 100))
    highestPercent = Math.max(highestPercent, rawPercent)
    onProgress(highestPercent)
  }

  async function processChunk(chunkItem) {
    const { index, files: chunkFiles } = chunkItem
    // Show subtle initial progress while compressing this batch
    chunkProgressMap.set(index, { loaded: 5, total: 100, fileCount: chunkFiles.length })
    updateGlobalProgress()

    // Compress large (> 6 MB) uncompressed camera files just-in-time per batch to < 10 MB
    const preparedFiles = await Promise.all(
      chunkFiles.map((f) => smartCompressGalleryPhoto(f))
    )

    chunkProgressMap.set(index, { loaded: 15, total: 100, fileCount: chunkFiles.length })
    updateGlobalProgress()

    const result = await uploadChunkWithProgress(
      eventId,
      preparedFiles,
      (loaded, total) => {
        // Reserve first 15% of each chunk's weight for compression and 85% for network upload
        const networkRatio = total > 0 ? Math.min(1, loaded / total) : 0
        chunkProgressMap.set(index, {
          loaded: 15 + networkRatio * 85,
          total: 100,
          fileCount: chunkFiles.length,
        })
        updateGlobalProgress()
      }
    )

    chunkProgressMap.delete(index)
    completedFiles += chunkFiles.length
    updateGlobalProgress()

    if (result) {
      if (Array.isArray(result.uploaded)) {
        uploadedAll = uploadedAll.concat(result.uploaded)
      }
      if (Array.isArray(result.failed)) {
        failedAll = failedAll.concat(result.failed)
      }
      if (typeof result.event_photo_count === 'number') {
        latestEventPhotoCount = result.event_photo_count
      }
    }
  }

  // Run chunks through a concurrent worker pool
  const queue = [...chunks]
  const workers = Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, async () => {
    while (queue.length > 0) {
      const nextChunk = queue.shift()
      if (nextChunk) {
        await processChunk(nextChunk)
      }
    }
  })

  await Promise.all(workers)

  if (typeof onProgress === 'function') {
    onProgress(100)
  }

  return {
    event_id: eventId,
    event_photo_count: latestEventPhotoCount,
    uploaded_count: uploadedAll.length,
    failed_count: failedAll.length,
    uploaded: uploadedAll,
    failed: failedAll,
  }
}

export async function fetchPhotoDetail(photoId) {
  const response = await fetch(`${API_BASE_URL}/photos/${photoId}/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function fetchPhotoSignedUrl(photoId, variant = 'original') {
  const response = await fetch(
    `${API_BASE_URL}/photos/${photoId}/signed-url/?variant=${encodeURIComponent(variant)}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
    }
  )
  return handleResponse(response)
}

export async function deletePhoto(photoId) {
  const response = await fetch(`${API_BASE_URL}/photos/${photoId}/`, {
    method: 'DELETE',
    headers: buildHeaders(true),
  })
  if (response.status === 204) return true
  return handleResponse(response)
}

/* Event QR Code Endpoints (Phase 6) */
export async function fetchEventQr(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/qr/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function generateEventQr(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/qr/generate/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function regenerateEventQr(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/qr/regenerate/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function deactivateEventQr(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/qr/deactivate/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function activateEventQr(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/qr/activate/`, {
    method: 'POST',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function updateEventQrExpiration(eventId, { expires_at, preset } = {}) {
  const body = preset ? { preset } : { expires_at: expires_at !== undefined ? expires_at : null }
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/qr/expiration/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  })
  return handleResponse(response)
}

export async function downloadEventQrFile(eventId, fileFormat = 'png', fallbackSlug = 'event') {
  const normalizedFormat = fileFormat === 'pdf' ? 'pdf' : 'png'
  const response = await fetch(
    `${API_BASE_URL}/events/${eventId}/qr/download/?file_format=${encodeURIComponent(normalizedFormat)}`,
    {
      method: 'GET',
      headers: buildHeaders(true, false),
    }
  )

  if (!response.ok) {
    return handleResponse(response)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  let filename = `smart-studio-qr-${fallbackSlug}.${normalizedFormat}`
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1]
  }

  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
  return filename
}

/* Public Guest QR Verification Endpoint (Phase 6 & 8) */
export async function verifyGuestQrToken(token) {
  const response = await fetch(
    `${API_BASE_URL}/guest/qr/${encodeURIComponent(token)}/`,
    {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    }
  )
  const data = await handleResponse(response)
  if (data?.csrf_token) {
    latestGuestCsrfToken = data.csrf_token
  }
  return data
}

/* AI Face Recognition Endpoints (Phase 7) */
export async function fetchEventRecognitionDashboard(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/recognition/`, {
    method: 'GET',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function updateEventRecognitionConfig(eventId, configPayload) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/recognition/config/`, {
    method: 'PUT',
    headers: buildHeaders(true),
    body: JSON.stringify(configPayload),
  })
  return handleResponse(response)
}

export async function startEventRecognitionIndexing(eventId, jobType = 'index_unindexed') {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/recognition/index/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ job_type: jobType }),
  })
  return handleResponse(response)
}

export async function retryFailedEventRecognition(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/recognition/retry/`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({}),
  })
  return handleResponse(response)
}

export async function purgeEventBiometricEmbeddings(eventId) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/recognition/embeddings/`, {
    method: 'DELETE',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function deletePhotoBiometricEmbeddings(photoId) {
  const response = await fetch(`${API_BASE_URL}/photos/${photoId}/embeddings/`, {
    method: 'DELETE',
    headers: buildHeaders(true),
  })
  return handleResponse(response)
}

export async function revokeEventGuestSessions(eventId) {
  const response = await fetch(
    `${API_BASE_URL}/events/${eventId}/recognition/guest-sessions/revoke/`,
    {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({}),
    }
  )
  return handleResponse(response)
}

/* Guest Consent, Selfie Matching & Preview Endpoints (Phase 8) */
export async function submitGuestConsent(
  qrToken,
  {
    consentAccepted,
    consentPathway = '',
    ageOrGuardianConfirmed = false,
    consentNoticeVersion = '2026.01-DPDP-v2',
  }
) {
  const headers = buildHeaders(false, true)
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken
  }

  const response = await fetch(
    `${API_BASE_URL}/guest/qr/${encodeURIComponent(qrToken)}/consent/`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        consent_accepted: Boolean(consentAccepted),
        consent_pathway: consentPathway,
        age_or_guardian_confirmed: Boolean(ageOrGuardianConfirmed),
        consent_notice_version: consentNoticeVersion,
      }),
    }
  )
  const data = await handleResponse(response)
  if (data?.csrf_token) {
    latestGuestCsrfToken = data.csrf_token
  }
  return data
}

export async function submitGuestSelfieForMatching(qrToken, selfieFile) {
  const formData = new FormData()
  formData.append('selfie', selfieFile)

  const headers = {}
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken
  }

  const response = await fetch(
    `${API_BASE_URL}/guest/qr/${encodeURIComponent(qrToken)}/match/`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    }
  )
  return handleResponse(response)
}

export async function fetchGuestMatchedResults(qrToken) {
  const headers = buildHeaders(false, false)

  const response = await fetch(
    `${API_BASE_URL}/guest/qr/${encodeURIComponent(qrToken)}/results/`,
    {
      method: 'GET',
      headers,
      credentials: 'include',
    }
  )
  return handleResponse(response)
}

/* Guest Secure Photo & ZIP Archive Download Endpoints (Phase 9) */
export async function downloadGuestMatchedPhoto(
  qrToken,
  photoId,
  fallbackFilename = `event-photo-${photoId}.jpg`
) {
  const response = await fetch(
    `${API_BASE_URL}/guest/qr/${encodeURIComponent(qrToken)}/download/${encodeURIComponent(photoId)}/`,
    {
      method: 'GET',
      headers: buildHeaders(false, false),
      credentials: 'include',
    }
  )

  if (!response.ok) {
    return handleResponse(response)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  let filename = fallbackFilename
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1]
  }

  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
  return { filename, bytes: blob.size }
}

export async function downloadAllGuestMatchedPhotosZip(
  qrToken,
  fallbackEventSlug = 'event'
) {
  const headers = buildHeaders(false, true)
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken
  }

  const response = await fetch(
    `${API_BASE_URL}/guest/qr/${encodeURIComponent(qrToken)}/download-all/`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({}),
    }
  )

  if (!response.ok) {
    return handleResponse(response)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  let filename = `${fallbackEventSlug}-matched-photos.zip`
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1]
  }

  const includedCount = Number(
    response.headers.get('x-included-photo-count') || 0
  )

  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
  return { filename, bytes: blob.size, includedCount }
}

/* Admin Guest Activity, Recognition Analytics & Event Reporting Endpoints (Phase 10) */
function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value).trim())
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export async function fetchAdminGuestActivitySummary(params = {}) {
  const query = buildQueryString(params)
  const response = await fetch(
    `${API_BASE_URL}/admin/guest-activity/summary/${query}`,
    {
      method: 'GET',
      headers: buildHeaders(true, false),
      credentials: 'include',
    }
  )
  return handleResponse(response)
}

export async function fetchAdminGuestActivityLogs(params = {}) {
  const query = buildQueryString(params)
  const response = await fetch(
    `${API_BASE_URL}/admin/guest-activity/logs/${query}`,
    {
      method: 'GET',
      headers: buildHeaders(true, false),
      credentials: 'include',
    }
  )
  return handleResponse(response)
}

export async function fetchAdminEventActivitySummary(eventId, params = {}) {
  const query = buildQueryString(params)
  const response = await fetch(
    `${API_BASE_URL}/admin/guest-activity/events/${encodeURIComponent(eventId)}/summary/${query}`,
    {
      method: 'GET',
      headers: buildHeaders(true, false),
      credentials: 'include',
    }
  )
  return handleResponse(response)
}

export async function fetchAdminEventActivityTimeline(eventId, params = {}) {
  const query = buildQueryString(params)
  const response = await fetch(
    `${API_BASE_URL}/admin/guest-activity/events/${encodeURIComponent(eventId)}/timeline/${query}`,
    {
      method: 'GET',
      headers: buildHeaders(true, false),
      credentials: 'include',
    }
  )
  return handleResponse(response)
}

async function triggerAuthenticatedBlobDownload(url, fallbackFilename) {
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(true, false),
    credentials: 'include',
  })

  if (!response.ok) {
    return handleResponse(response)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  let filename = fallbackFilename
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1]
  }

  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
  return { filename, bytes: blob.size }
}

export async function downloadAdminEventActivityCsv(eventId, params = {}) {
  const query = buildQueryString(params)
  return triggerAuthenticatedBlobDownload(
    `${API_BASE_URL}/admin/guest-activity/events/${encodeURIComponent(eventId)}/export/csv/${query}`,
    `event-${eventId}-guest-activity-log.csv`
  )
}

export async function downloadAdminEventDownloadsCsv(eventId, params = {}) {
  const query = buildQueryString(params)
  return triggerAuthenticatedBlobDownload(
    `${API_BASE_URL}/admin/guest-activity/events/${encodeURIComponent(eventId)}/export/downloads-csv/${query}`,
    `event-${eventId}-downloads-summary.csv`
  )
}

export async function downloadAdminEventEngagementPdf(eventId, params = {}) {
  const query = buildQueryString(params)
  return triggerAuthenticatedBlobDownload(
    `${API_BASE_URL}/admin/guest-activity/events/${encodeURIComponent(eventId)}/export/pdf/${query}`,
    `event-${eventId}-engagement-report.pdf`
  )
}





