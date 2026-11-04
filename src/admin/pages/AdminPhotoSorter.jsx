import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchEvents, uploadEventPhotos } from '../../services/api.js'
import './AdminPhotoSorter.css'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// MediaPipe CDN for in-browser 478-point Face Landmarker & Eye Blink Blendshapes
const MEDIAPIPE_VISION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
const MEDIAPIPE_WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let cachedLandmarkerPromise = null

async function getFaceLandmarker() {
  if (!cachedLandmarkerPromise) {
    cachedLandmarkerPromise = (async () => {
      const vision = await import(/* @vite-ignore */ MEDIAPIPE_VISION_CDN)
      const { FaceLandmarker, FilesetResolver } = vision
      const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT)
      return FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        },
        outputFaceBlendshapes: true,
        runningMode: 'IMAGE',
        numFaces: 8,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
      })
    })().catch((err) => {
      cachedLandmarkerPromise = null
      throw err
    })
  }
  return cachedLandmarkerPromise
}

function isSupportedImageName(name = '') {
  const lower = name.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function dist2D(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

// Compute geometric Eye Aspect Ratio (EAR) from MediaPipe 478 face landmarks
function computeEyeAspectRatio(landmarks, indices) {
  const [p1, p2, p3, p4, p5, p6] = indices.map((idx) => landmarks[idx])
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.3
  const vertical1 = dist2D(p2, p6)
  const vertical2 = dist2D(p3, p5)
  const horizontal = dist2D(p1, p4)
  if (horizontal <= 1e-5) return 0.3
  return (vertical1 + vertical2) / (2.0 * horizontal)
}

// Compute Laplacian variance sharpness score on a specific region (or center of image)
function computeRegionSharpness(imageData, width, height, region = null) {
  const data = imageData.data
  const x0 = Math.max(1, Math.floor(region ? region.x : width * 0.15))
  const y0 = Math.max(1, Math.floor(region ? region.y : height * 0.15))
  const x1 = Math.min(width - 2, Math.ceil(region ? region.x + region.w : width * 0.85))
  const y1 = Math.min(height - 2, Math.ceil(region ? region.y + region.h : height * 0.85))

  if (x1 <= x0 + 4 || y1 <= y0 + 4) return 100

  // Convert to luminance array for the region
  const rw = x1 - x0 + 2
  const rh = y1 - y0 + 2
  const gray = new Float32Array(rw * rh)

  for (let y = y0 - 1; y <= y1; y++) {
    const rowOffset = (y - (y0 - 1)) * rw
    for (let x = x0 - 1; x <= x1; x++) {
      const idx = (y * width + x) * 4
      gray[rowOffset + (x - (x0 - 1))] =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
    }
  }

  let sum = 0
  let sumSq = 0
  let count = 0

  for (let y = 1; y < rh - 1; y++) {
    const row = y * rw
    for (let x = 1; x < rw - 1; x++) {
      const c = gray[row + x]
      const lap =
        gray[(y - 1) * rw + x] +
        gray[(y + 1) * rw + x] +
        gray[row + x - 1] +
        gray[row + x + 1] -
        4 * c
      sum += lap
      sumSq += lap * lap
      count++
    }
  }

  if (count === 0) return 100
  const mean = sum / count
  return Math.max(0, sumSq / count - mean * mean)
}

async function analyzeSinglePhoto(file, landmarker, thresholds) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = objectUrl
    })

    const origW = img.naturalWidth || img.width || 1200
    const origH = img.naturalHeight || img.height || 800

    // Scale to analysis resolution (max 960px long edge) for fast & consistent sharpness + landmark detection
    const maxAnalysisDim = 960
    const scale = Math.min(1, maxAnalysisDim / Math.max(origW, origH))
    const cw = Math.max(64, Math.round(origW * scale))
    const ch = Math.max(64, Math.round(origH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, cw, ch)
    const imgData = ctx.getImageData(0, 0, cw, ch)

    let faceBoxes = []
    let closedFacesCount = 0
    let openFacesCount = 0
    let maxBlinkScore = 0

    if (landmarker) {
      const result = landmarker.detect(canvas)
      const faceLandmarksList = result?.faceLandmarks || []
      const faceBlendshapesList = result?.faceBlendshapes || []

      faceLandmarksList.forEach((landmarks, fIdx) => {
        let minX = 1
        let minY = 1
        let maxX = 0
        let maxY = 0
        landmarks.forEach((pt) => {
          if (pt.x < minX) minX = pt.x
          if (pt.y < minY) minY = pt.y
          if (pt.x > maxX) maxX = pt.x
          if (pt.y > maxY) maxY = pt.y
        })

        // Left and right eye 6-point indices in MediaPipe 478 mesh
        const leftEAR = computeEyeAspectRatio(landmarks, [33, 160, 158, 133, 153, 144])
        const rightEAR = computeEyeAspectRatio(landmarks, [362, 385, 387, 263, 373, 380])
        const avgEAR = (leftEAR + rightEAR) / 2

        const categories = faceBlendshapesList[fIdx]?.categories || []
        const blinkL =
          categories.find((c) => c.categoryName === 'eyeBlinkLeft')?.score ?? 0
        const blinkR =
          categories.find((c) => c.categoryName === 'eyeBlinkRight')?.score ?? 0
        const avgBlinkBlend = (blinkL + blinkR) / 2

        // Combined blink confidence (0..100)
        const earBlinkScore = Math.max(0, Math.min(1, (0.23 - avgEAR) / 0.11))
        const combinedBlink = Math.max(avgBlinkBlend, earBlinkScore)
        const blinkPercent = Math.round(combinedBlink * 100)
        if (blinkPercent > maxBlinkScore) {
          maxBlinkScore = blinkPercent
        }

        const isEyesClosed =
          combinedBlink >= thresholds.blinkThreshold ||
          (blinkL >= thresholds.blinkThreshold + 0.06 &&
            blinkR >= thresholds.blinkThreshold + 0.06) ||
          avgEAR < 0.165

        if (isEyesClosed) {
          closedFacesCount++
        } else {
          openFacesCount++
        }

        // Compute sharpness inside this face bounding box
        const fx = Math.max(0, minX * cw)
        const fy = Math.max(0, minY * ch)
        const fw = Math.max(16, (maxX - minX) * cw)
        const fh = Math.max(16, (maxY - minY) * ch)
        const faceSharpness = computeRegionSharpness(imgData, cw, ch, {
          x: fx,
          y: fy,
          w: fw,
          h: fh,
        })

        faceBoxes.push({
          x: Math.max(0, minX),
          y: Math.max(0, minY),
          w: Math.min(1, maxX - minX),
          h: Math.min(1, maxY - minY),
          isEyesClosed,
          blinkPercent,
          ear: Number(avgEAR.toFixed(3)),
          sharpness: Math.round(faceSharpness),
        })
      })
    }

    // Overall sharpness: if faces exist, use the sharpest/average face sharpness so bokeh backgrounds never trigger false blur
    let sharpnessScore = 0
    if (faceBoxes.length > 0) {
      const maxFaceSharpness = Math.max(...faceBoxes.map((b) => b.sharpness))
      sharpnessScore = Math.round(maxFaceSharpness)
    } else {
      sharpnessScore = Math.round(computeRegionSharpness(imgData, cw, ch, null))
    }

    const isBlurry = sharpnessScore < thresholds.blurThreshold
    const totalFaces = faceBoxes.length

    // Classification priority:
    // 1. Blurry if sharpness is below threshold
    // 2. Partial Blink (needs client confirmation -> goes to Eyes_Closed when confirmed) if >1 faces and both open & closed exist
    // 3. Eyes Closed if all detected faces have closed eyes (or solo portrait blinked)
    // 4. Good / Sharp otherwise
    let detectedCategory = 'good'
    let partialBlinkPending = false
    let statusReason = 'Sharp focus & open eyes'

    if (isBlurry) {
      detectedCategory = 'blurry'
      statusReason = `Low sharpness score (${sharpnessScore} < ${thresholds.blurThreshold})`
    } else if (totalFaces > 0 && closedFacesCount > 0) {
      if (openFacesCount > 0) {
        // Group photo with partial blink — ask client to confirm putting into Eyes_Closed
        detectedCategory = 'partial_blink'
        partialBlinkPending = true
        statusReason = `Partial Blink: ${closedFacesCount} of ${totalFaces} faces has eyes closed (Confirm to move to Eyes_Closed)`
      } else {
        detectedCategory = 'eyes_closed'
        statusReason =
          totalFaces === 1
            ? `Eyes closed detected (Blink score ${maxBlinkScore}%)`
            : `All ${totalFaces} faces have eyes closed`
      }
    } else if (totalFaces === 0) {
      statusReason = `Sharp non-portrait / candid frame (Sharpness ${sharpnessScore})`
    }

    return {
      width: origW,
      height: origH,
      sharpnessScore,
      maxBlinkScore,
      totalFaces,
      closedFacesCount,
      openFacesCount,
      faceBoxes,
      detectedCategory,
      category: detectedCategory, // Current active category ('good' | 'eyes_closed' | 'blurry' | 'partial_blink')
      partialBlinkPending,
      statusReason,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function AdminPhotoSorter() {
  const [folderName, setFolderName] = useState('')
  const [directoryHandle, setDirectoryHandle] = useState(null)
  const [items, setItems] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 })
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'good' | 'eyes_closed' | 'partial_blink' | 'blurry'

  // Sensitivity controls
  const [blurThreshold, setBlurThreshold] = useState(55)
  const [blinkThreshold, setBlinkThreshold] = useState(0.45)

  // Preview Modal state
  const [previewId, setPreviewId] = useState(null)
  const [showOverlayBoxes, setShowOverlayBoxes] = useState(true)

  // Move to local folders state
  const [movingFiles, setMovingFiles] = useState(false)
  const [actionBanner, setActionBanner] = useState(null)

  // Upload good photos to event state
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [uploadingGood, setUploadingGood] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)

  const fallbackInputRef = useRef(null)
  const previewUrlsRef = useRef(new Map())

  useEffect(() => {
    fetchEvents()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setEvents(list)
          setSelectedEventId(String(list[0].id))
        }
      })
      .catch(() => {})
  }, [])

  // Cleanup preview blob URLs on unmount
  useEffect(() => {
    const map = previewUrlsRef.current
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url))
      map.clear()
    }
  }, [])

  const clearExistingUrls = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current.clear()
  }

  const runBatchScan = useCallback(
    async (fileEntries, dirHandle, label) => {
      clearExistingUrls()
      setDirectoryHandle(dirHandle || null)
      setFolderName(label || 'Selected Folder')
      setItems([])
      setActionBanner(null)
      setScanning(true)
      setScanProgress({ done: 0, total: fileEntries.length })

      let landmarker = null
      try {
        landmarker = await getFaceLandmarker()
      } catch {
        // Fallback if offline/blocked: still performs sharpness analysis
        landmarker = null
      }

      const analyzed = []
      const BATCH = 3
      for (let i = 0; i < fileEntries.length; i += BATCH) {
        const slice = fileEntries.slice(i, i + BATCH)
        const batchResults = await Promise.all(
          slice.map(async (entry, idx) => {
            const id = `${i + idx}-${entry.file.name}`
            const previewUrl = URL.createObjectURL(entry.file)
            previewUrlsRef.current.set(id, previewUrl)
            try {
              const metrics = await analyzeSinglePhoto(entry.file, landmarker, {
                blurThreshold,
                blinkThreshold,
              })
              return {
                id,
                name: entry.file.name,
                size: entry.file.size,
                file: entry.file,
                fileHandle: entry.handle || null,
                previewUrl,
                movedToFolder: null,
                ...metrics,
              }
            } catch {
              return {
                id,
                name: entry.file.name,
                size: entry.file.size,
                file: entry.file,
                fileHandle: entry.handle || null,
                previewUrl,
                movedToFolder: null,
                width: 0,
                height: 0,
                sharpnessScore: 100,
                maxBlinkScore: 0,
                totalFaces: 0,
                closedFacesCount: 0,
                openFacesCount: 0,
                faceBoxes: [],
                detectedCategory: 'good',
                category: 'good',
                partialBlinkPending: false,
                statusReason: 'Standard image',
              }
            }
          })
        )
        analyzed.push(...batchResults)
        setItems([...analyzed])
        setScanProgress({ done: analyzed.length, total: fileEntries.length })
      }

      setScanning(false)
    },
    [blurThreshold, blinkThreshold]
  )

  // Method 1: Chrome / Edge Directory Picker (Read + Write directly to PC folder)
  const handlePickDirectoryReadWrite = async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      if (fallbackInputRef.current) {
        fallbackInputRef.current.click()
      }
      return
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      const entries = []
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file' && isSupportedImageName(name)) {
          const file = await handle.getFile()
          entries.push({ file, handle })
        }
      }

      if (entries.length === 0) {
        setActionBanner({
          type: 'error',
          text: `No supported photographs (.jpg, .png, .webp) were found inside "${dirHandle.name}".`,
        })
        return
      }

      entries.sort((a, b) => a.file.name.localeCompare(b.file.name))
      await runBatchScan(entries, dirHandle, dirHandle.name)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setActionBanner({
          type: 'error',
          text: err?.message || 'Unable to access the selected folder.',
        })
      }
    }
  }

  // Method 2: Fallback Folder Input (<input webkitdirectory>)
  const handleFallbackInputChange = async (e) => {
    const fileList = Array.from(e.target.files || [])
    e.target.value = ''
    const imageFiles = fileList.filter((f) => isSupportedImageName(f.name))
    if (imageFiles.length === 0) return

    const firstRel = imageFiles[0]?.webkitRelativePath || ''
    const folderLabel = firstRel.includes('/') ? firstRel.split('/')[0] : 'Selected Photos'
    const entries = imageFiles.map((file) => ({ file, handle: null }))
    await runBatchScan(entries, null, folderLabel)
  }

  // Change category of a single photo (Confirm / Override)
  const handleChangePhotoCategory = (id, nextCategory) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          category: nextCategory,
          partialBlinkPending: false,
          statusReason:
            nextCategory === 'good'
              ? 'Approved by Admin as Good Photo'
              : nextCategory === 'eyes_closed'
              ? 'Confirmed: Eyes Closed (Will move to Eyes_Closed folder)'
              : 'Confirmed: Blurry (Will move to Blurry_Photos folder)',
        }
      })
    )
  }

  // Confirm all partial blinks directly into Eyes_Closed
  const handleConfirmAllPartialBlinksToEyesClosed = () => {
    setItems((prev) =>
      prev.map((item) =>
        item.category === 'partial_blink'
          ? {
              ...item,
              category: 'eyes_closed',
              partialBlinkPending: false,
              statusReason: 'Partial Blink Confirmed -> Added to Eyes_Closed folder queue',
            }
          : item
      )
    )
    setActionBanner({
      type: 'success',
      text: 'All Partial Blink photographs have been confirmed and placed directly into the "Eyes Closed" queue.',
    })
  }

  // Move confirmed Eyes_Closed and Blurry photos into two separate folders on PC
  const handleMoveToSeparateFolders = async () => {
    const pendingPartials = items.filter(
      (i) => i.category === 'partial_blink' && !i.movedToFolder
    )
    let workingItems = items

    if (pendingPartials.length > 0) {
      const confirmPartials = window.confirm(
        `You have ${pendingPartials.length} "Partial Blink" photo(s) awaiting confirmation.\n\nClick OK to confirm and move them directly into the "Eyes_Closed" folder as well, or Cancel to review them first.`
      )
      if (!confirmPartials) {
        setActiveTab('partial_blink')
        return
      }
      workingItems = items.map((item) =>
        item.category === 'partial_blink'
          ? { ...item, category: 'eyes_closed', partialBlinkPending: false }
          : item
      )
      setItems(workingItems)
    }

    const eyesClosedList = workingItems.filter(
      (i) => i.category === 'eyes_closed' && !i.movedToFolder
    )
    const blurryList = workingItems.filter(
      (i) => i.category === 'blurry' && !i.movedToFolder
    )

    if (eyesClosedList.length === 0 && blurryList.length === 0) {
      setActionBanner({
        type: 'error',
        text: 'There are no Eyes Closed or Blurry photographs left to move.',
      })
      return
    }

    setMovingFiles(true)
    setActionBanner(null)

    try {
      let targetRootHandle = directoryHandle
      if (!targetRootHandle && typeof window.showDirectoryPicker === 'function') {
        targetRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
        setDirectoryHandle(targetRootHandle)
      }

      if (!targetRootHandle) {
        throw new Error(
          'Your current browser does not allow direct local folder creation. Please open this page in Google Chrome or Microsoft Edge to move files directly on your PC.'
        )
      }

      let movedEyesCount = 0
      let movedBlurryCount = 0
      const movedMap = new Map()

      // 1. Create "Eyes_Closed" folder if needed and move files
      if (eyesClosedList.length > 0) {
        const eyesFolderHandle = await targetRootHandle.getDirectoryHandle('Eyes_Closed', {
          create: true,
        })
        for (const item of eyesClosedList) {
          const destFileHandle = await eyesFolderHandle.getFileHandle(item.name, {
            create: true,
          })
          const writable = await destFileHandle.createWritable()
          await writable.write(item.file)
          await writable.close()

          // Remove original file from source folder so it is truly moved
          try {
            await targetRootHandle.removeEntry(item.name)
          } catch {
            // Ignore if source was chosen from a different folder
          }
          movedEyesCount++
          movedMap.set(item.id, 'Eyes_Closed')
        }
      }

      // 2. Create "Blurry_Photos" folder if needed and move files
      if (blurryList.length > 0) {
        const blurryFolderHandle = await targetRootHandle.getDirectoryHandle('Blurry_Photos', {
          create: true,
        })
        for (const item of blurryList) {
          const destFileHandle = await blurryFolderHandle.getFileHandle(item.name, {
            create: true,
          })
          const writable = await destFileHandle.createWritable()
          await writable.write(item.file)
          await writable.close()

          try {
            await targetRootHandle.removeEntry(item.name)
          } catch {
            // Ignore if source was chosen from a different folder
          }
          movedBlurryCount++
          movedMap.set(item.id, 'Blurry_Photos')
        }
      }

      setItems((prev) =>
        prev.map((item) =>
          movedMap.has(item.id)
            ? { ...item, movedToFolder: movedMap.get(item.id) }
            : item
        )
      )

      setActionBanner({
        type: 'success',
        text: `Moved ${movedEyesCount} photo(s) into "${targetRootHandle.name}/Eyes_Closed/" and ${movedBlurryCount} photo(s) into "${targetRootHandle.name}/Blurry_Photos/"!`,
      })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setActionBanner({
          type: 'error',
          text: err?.message || 'Unable to move files to new folders.',
        })
      }
    } finally {
      setMovingFiles(false)
    }
  }

  // Upload only approved Good photos to the selected Studio Event
  const handleUploadGoodPhotosToEvent = async () => {
    const goodPhotos = items.filter((i) => i.category === 'good' && !i.movedToFolder)
    if (!selectedEventId) {
      setActionBanner({
        type: 'error',
        text: 'Please select an Event first before uploading sorted Good photographs.',
      })
      return
    }
    if (goodPhotos.length === 0) {
      setActionBanner({
        type: 'error',
        text: 'No Good photographs are available to upload.',
      })
      return
    }

    setUploadingGood(true)
    setUploadPercent(0)
    setActionBanner(null)

    try {
      const filesToUpload = goodPhotos.map((i) => i.file)
      const res = await uploadEventPhotos(
        Number(selectedEventId),
        filesToUpload,
        (pct) => setUploadPercent(pct)
      )
      const evName =
        events.find((e) => String(e.id) === String(selectedEventId))?.name || 'Event'
      setActionBanner({
        type: 'success',
        text: `Successfully uploaded ${res.uploaded_count} sorted Good photograph(s) to "${evName}"! AI face indexing has started automatically.`,
      })
    } catch (err) {
      setActionBanner({
        type: 'error',
        text: err?.message || 'Failed to upload sorted photographs.',
      })
    } finally {
      setUploadingGood(false)
    }
  }

  const counts = useMemo(() => {
    const c = { all: items.length, good: 0, eyes_closed: 0, partial_blink: 0, blurry: 0 }
    items.forEach((item) => {
      if (c[item.category] !== undefined) {
        c[item.category]++
      }
    })
    return c
  }, [items])

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items
    return items.filter((i) => i.category === activeTab)
  }, [items, activeTab])

  const previewItem = useMemo(
    () => items.find((i) => i.id === previewId) || null,
    [items, previewId]
  )

  const handleNavigatePreview = useCallback(
    (dir) => {
      if (!previewItem || filteredItems.length === 0) return
      const idx = filteredItems.findIndex((i) => i.id === previewItem.id)
      if (idx === -1) return
      const nextIdx = (idx + dir + filteredItems.length) % filteredItems.length
      setPreviewId(filteredItems[nextIdx].id)
    },
    [previewItem, filteredItems]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (!previewItem) return
      if (e.key === 'Escape') setPreviewId(null)
      if (e.key === 'ArrowRight') handleNavigatePreview(1)
      if (e.key === 'ArrowLeft') handleNavigatePreview(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewItem, handleNavigatePreview])

  return (
    <div className="admin-sorter fade-up">
      {/* Top Control Card */}
      <section className="admin-sorter__hero-card">
        <div className="admin-sorter__hero-top">
          <div>
            <span className="section-eyebrow">AI Smart Culling &amp; Folder Sorter</span>
            <h2 className="admin-sorter__title">
              Detect Eyes Closed &amp; Blurry Photos Automatically
            </h2>
            <p className="admin-sorter__subtitle">
              Select a local shoot folder on your PC. Our AI inspects every face for closed eyes,
              partial group blinks, and focus blur—letting you preview, confirm, and automatically
              move rejected shots into separate <code>Eyes_Closed</code> and{' '}
              <code>Blurry_Photos</code> folders or upload only the good photos.
            </p>
          </div>

          <div className="admin-sorter__folder-btns">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePickDirectoryReadWrite}
              disabled={scanning || movingFiles || uploadingGood}
            >
              📂 Select Shoot Folder (Scan &amp; Sort)
            </button>
            <input
              ref={fallbackInputRef}
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFallbackInputChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Sensitivity Sliders */}
        <div className="admin-sorter__settings-bar">
          <div className="admin-sorter__slider-group">
            <label htmlFor="sorter-blur-slider">
              Blur Sensitivity Threshold: <strong>{blurThreshold}</strong>
            </label>
            <input
              id="sorter-blur-slider"
              type="range"
              min="20"
              max="120"
              value={blurThreshold}
              onChange={(e) => setBlurThreshold(Number(e.target.value))}
              disabled={scanning}
            />
            <small>Higher = stricter sharpness check</small>
          </div>

          <div className="admin-sorter__slider-group">
            <label htmlFor="sorter-blink-slider">
              Eye-Blink Sensitivity: <strong>{Math.round(blinkThreshold * 100)}%</strong>
            </label>
            <input
              id="sorter-blink-slider"
              type="range"
              min="30"
              max="70"
              value={Math.round(blinkThreshold * 100)}
              onChange={(e) => setBlinkThreshold(Number(e.target.value) / 100)}
              disabled={scanning}
            />
            <small>Lower = flags narrower squints/blinks</small>
          </div>

          {folderName && (
            <div className="admin-sorter__active-folder">
              <span>Active Folder:</span>
              <strong>📁 {folderName}</strong>
              <small>({items.length} photos scanned)</small>
            </div>
          )}
        </div>

        {/* Scan Progress Bar */}
        {scanning && (
          <div className="admin-sorter__progress-box" role="status">
            <div className="admin-sorter__progress-header">
              <strong>
                Scanning &amp; Detecting Faces / Eyes / Sharpness ({scanProgress.done} of{' '}
                {scanProgress.total})...
              </strong>
              <span>
                {scanProgress.total > 0
                  ? Math.round((scanProgress.done / scanProgress.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="admin-sorter__progress-track">
              <div
                className="admin-sorter__progress-fill"
                style={{
                  width: `${
                    scanProgress.total > 0
                      ? Math.round((scanProgress.done / scanProgress.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Feedback Banner */}
      {actionBanner && (
        <div
          className={`admin-sorter__banner admin-sorter__banner--${actionBanner.type}`}
          role="status"
        >
          <span>{actionBanner.text}</span>
          <button
            type="button"
            className="admin-sorter__banner-close"
            onClick={() => setActionBanner(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Partial Blink Client Confirmation Prompt Banner */}
      {counts.partial_blink > 0 && !scanning && (
        <div className="admin-sorter__partial-prompt" role="region" aria-label="Partial Blink Confirmation">
          <div className="admin-sorter__partial-info">
            <span className="admin-sorter__partial-badge">⚠️ Client Confirmation Requested</span>
            <h3>
              {counts.partial_blink} Group Photo{counts.partial_blink === 1 ? ' Has' : 's Have'} a
              Partial Blink (1 Person Closed Eyes)
            </h3>
            <p>
              Please confirm whether you want to place these partial-blink photographs directly into
              the <strong>Eyes_Closed</strong> folder, or review them individually first.
            </p>
          </div>
          <div className="admin-sorter__partial-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setActiveTab('partial_blink')}
            >
              👁️ Review Partial Blinks ({counts.partial_blink})
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmAllPartialBlinksToEyesClosed}
            >
              ✓ Confirm &amp; Put All in Eyes Closed
            </button>
          </div>
        </div>
      )}

      {/* Results Dashboard & Action Bar */}
      {items.length > 0 && (
        <section className="admin-sorter__workspace">
          {/* Category Filter Tabs */}
          <div className="admin-sorter__tabs-row">
            <div className="admin-sorter__tabs" role="tablist">
              <button
                type="button"
                className={`admin-sorter__tab ${activeTab === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Photos <span>{counts.all}</span>
              </button>
              <button
                type="button"
                className={`admin-sorter__tab admin-sorter__tab--good ${
                  activeTab === 'good' ? 'is-active' : ''
                }`}
                onClick={() => setActiveTab('good')}
              >
                ✅ Good / Sharp <span>{counts.good}</span>
              </button>
              <button
                type="button"
                className={`admin-sorter__tab admin-sorter__tab--eyes ${
                  activeTab === 'eyes_closed' ? 'is-active' : ''
                }`}
                onClick={() => setActiveTab('eyes_closed')}
              >
                😑 Eyes Closed <span>{counts.eyes_closed}</span>
              </button>
              <button
                type="button"
                className={`admin-sorter__tab admin-sorter__tab--partial ${
                  activeTab === 'partial_blink' ? 'is-active' : ''
                }`}
                onClick={() => setActiveTab('partial_blink')}
              >
                ⚠️ Partial Blink (Confirm) <span>{counts.partial_blink}</span>
              </button>
              <button
                type="button"
                className={`admin-sorter__tab admin-sorter__tab--blurry ${
                  activeTab === 'blurry' ? 'is-active' : ''
                }`}
                onClick={() => setActiveTab('blurry')}
              >
                🌫️ Blurry <span>{counts.blurry}</span>
              </button>
            </div>

            {/* Primary Batch Actions: 1) Move Rejected to 2 Separate Folders, 2) Upload Good to Event */}
            <div className="admin-sorter__batch-actions">
              <button
                type="button"
                className="btn btn-outline admin-sorter__move-btn"
                onClick={handleMoveToSeparateFolders}
                disabled={
                  scanning ||
                  movingFiles ||
                  uploadingGood ||
                  (counts.eyes_closed === 0 &&
                    counts.blurry === 0 &&
                    counts.partial_blink === 0)
                }
              >
                {movingFiles
                  ? 'Moving to Folders...'
                  : `📁 Move to 2 Folders (Eyes_Closed: ${
                      counts.eyes_closed + counts.partial_blink
                    } • Blurry: ${counts.blurry})`}
              </button>

              <div className="admin-sorter__upload-group">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="admin-sorter__event-select"
                  disabled={uploadingGood || events.length === 0}
                  aria-label="Select target event for uploading good photos"
                >
                  {events.length === 0 ? (
                    <option value="">No Events Available</option>
                  ) : (
                    events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUploadGoodPhotosToEvent}
                  disabled={scanning || movingFiles || uploadingGood || counts.good === 0}
                >
                  {uploadingGood
                    ? `Uploading Good Photos (${uploadPercent}%)...`
                    : `☁️ Upload ${counts.good} Good Photo${counts.good === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>

          {/* Photo Cards Grid */}
          <div className="admin-sorter__grid">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={`admin-sorter__card admin-sorter__card--${item.category} ${
                  item.movedToFolder ? 'is-moved' : ''
                }`}
              >
                <div
                  className="admin-sorter__thumb-wrap"
                  onClick={() => setPreviewId(item.id)}
                  title="Click to Preview Detected Face & Original Image"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    loading="lazy"
                    className="admin-sorter__thumb"
                  />
                  <span className={`admin-sorter__badge admin-sorter__badge--${item.category}`}>
                    {item.category === 'good' && '✅ Good / Sharp'}
                    {item.category === 'eyes_closed' && '😑 Eyes Closed'}
                    {item.category === 'partial_blink' && '⚠️ Partial Blink'}
                    {item.category === 'blurry' && '🌫️ Blurry'}
                  </span>
                  {item.movedToFolder && (
                    <span className="admin-sorter__moved-pill">
                      Moved &rarr; {item.movedToFolder}/
                    </span>
                  )}
                  <button
                    type="button"
                    className="admin-sorter__preview-trigger"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewId(item.id)
                    }}
                  >
                    🔍 Preview &amp; Confirm
                  </button>
                </div>

                <div className="admin-sorter__card-body">
                  <div className="admin-sorter__card-title-row">
                    <strong title={item.name}>{item.name}</strong>
                    <span>{(item.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <p className="admin-sorter__reason">{item.statusReason}</p>
                  <div className="admin-sorter__metrics">
                    <span>Sharpness: {item.sharpnessScore}</span>
                    <span>
                      Faces: {item.totalFaces}
                      {item.closedFacesCount > 0
                        ? ` (${item.closedFacesCount} closed)`
                        : ''}
                    </span>
                  </div>

                  {/* Quick Confirm / Override Buttons on Card */}
                  <div className="admin-sorter__card-actions">
                    <button
                      type="button"
                      className={`admin-sorter__mini-btn ${
                        item.category === 'good' ? 'is-selected-good' : ''
                      }`}
                      onClick={() => handleChangePhotoCategory(item.id, 'good')}
                    >
                      ✓ Keep Good
                    </button>
                    <button
                      type="button"
                      className={`admin-sorter__mini-btn ${
                        item.category === 'eyes_closed' ? 'is-selected-eyes' : ''
                      }`}
                      onClick={() => handleChangePhotoCategory(item.id, 'eyes_closed')}
                    >
                      😑 Eyes Closed
                    </button>
                    <button
                      type="button"
                      className={`admin-sorter__mini-btn ${
                        item.category === 'blurry' ? 'is-selected-blurry' : ''
                      }`}
                      onClick={() => handleChangePhotoCategory(item.id, 'blurry')}
                    >
                      🌫️ Blurry
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Side-by-Side / Interactive Detection Preview Modal */}
      {previewItem && (
        <div
          className="admin-sorter-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewItem.name}`}
        >
          <div
            className="admin-sorter-modal__backdrop"
            onClick={() => setPreviewId(null)}
          />
          <div className="admin-sorter-modal__dialog fade-up">
            <div className="admin-sorter-modal__header">
              <div>
                <span className="section-eyebrow">
                  AI Detection &amp; Original Photo Confirmation
                </span>
                <h3>{previewItem.name}</h3>
                <p>{previewItem.statusReason}</p>
              </div>
              <div className="admin-sorter-modal__header-right">
                <label className="admin-sorter-modal__toggle">
                  <input
                    type="checkbox"
                    checked={showOverlayBoxes}
                    onChange={(e) => setShowOverlayBoxes(e.target.checked)}
                  />
                  <span>Show AI Face &amp; Eye Detection Boxes</span>
                </label>
                <button
                  type="button"
                  className="admin-sorter-modal__close"
                  onClick={() => setPreviewId(null)}
                  aria-label="Close preview"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="admin-sorter-modal__stage">
              <button
                type="button"
                className="admin-sorter-modal__nav admin-sorter-modal__nav--prev"
                onClick={() => handleNavigatePreview(-1)}
                aria-label="Previous photo"
              >
                &lsaquo;
              </button>

              <div className="admin-sorter-modal__image-container">
                <img
                  src={previewItem.previewUrl}
                  alt={previewItem.name}
                  className="admin-sorter-modal__img"
                />
                {showOverlayBoxes &&
                  previewItem.faceBoxes.map((box, bIdx) => (
                    <div
                      key={bIdx}
                      className={`admin-sorter-modal__face-box ${
                        box.isEyesClosed ? 'is-closed' : 'is-open'
                      }`}
                      style={{
                        left: `${box.x * 100}%`,
                        top: `${box.y * 100}%`,
                        width: `${box.w * 100}%`,
                        height: `${box.h * 100}%`,
                      }}
                    >
                      <span className="admin-sorter-modal__face-tag">
                        {box.isEyesClosed
                          ? `😑 Eyes Closed (${box.blinkPercent}%)`
                          : `👀 Eyes Open (Sharp: ${box.sharpness})`}
                      </span>
                    </div>
                  ))}
              </div>

              <button
                type="button"
                className="admin-sorter-modal__nav admin-sorter-modal__nav--next"
                onClick={() => handleNavigatePreview(1)}
                aria-label="Next photo"
              >
                &rsaquo;
              </button>
            </div>

            <div className="admin-sorter-modal__footer">
              <div className="admin-sorter-modal__meta">
                <span>
                  Dimensions: {previewItem.width} &times; {previewItem.height}px
                </span>
                <span>Sharpness Score: {previewItem.sharpnessScore}</span>
                <span>Detected Faces: {previewItem.totalFaces}</span>
              </div>

              <div className="admin-sorter-modal__confirm-btns">
                <button
                  type="button"
                  className={`btn ${
                    previewItem.category === 'good' ? 'btn-primary' : 'btn-outline'
                  }`}
                  onClick={() => handleChangePhotoCategory(previewItem.id, 'good')}
                >
                  ✅ Confirm as Good Photo
                </button>
                <button
                  type="button"
                  className={`btn ${
                    previewItem.category === 'eyes_closed' ? 'btn-primary' : 'btn-outline'
                  }`}
                  onClick={() => handleChangePhotoCategory(previewItem.id, 'eyes_closed')}
                >
                  😑 Confirm as Eyes Closed (Move to Eyes_Closed)
                </button>
                <button
                  type="button"
                  className={`btn ${
                    previewItem.category === 'blurry' ? 'btn-primary' : 'btn-outline'
                  }`}
                  onClick={() => handleChangePhotoCategory(previewItem.id, 'blurry')}
                >
                  🌫️ Confirm as Blurry (Move to Blurry_Photos)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPhotoSorter

