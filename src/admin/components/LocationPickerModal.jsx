import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './LocationPickerModal.css'

// Fix default Leaflet icon paths in Vite bundle
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Dynamic Google Maps Script Loader
let googleMapsLoaderPromise = null

function loadGoogleMapsSdk(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'))
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google.maps)
  }
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API Key is required.'))
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-js-sdk')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps))
      existing.addEventListener('error', (e) => reject(e))
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-js-sdk'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps SDK loaded but window.google.maps is undefined.'))
      }
    }

    script.onerror = () => {
      googleMapsLoaderPromise = null
      reject(new Error('Failed to load Google Maps SDK. Please verify your API key and network connection.'))
    }

    document.head.appendChild(script)
  })

  return googleMapsLoaderPromise
}

// Retrieve API key from Vite environment or localStorage
function getStoredGoogleApiKey() {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (envKey && envKey.trim()) return envKey.trim()
  if (typeof window !== 'undefined') {
    const localKey = window.localStorage.getItem('layam_google_maps_api_key')
    if (localKey && localKey.trim()) return localKey.trim()
  }
  return ''
}

// Parse coordinates from Google Maps URLs or DMS strings
function parseGoogleMapsOrCoordString(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null
  const str = decodeURIComponent(rawInput.trim())

  // 1. Google Maps URL patterns:
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  }

  const queryMatch = str.match(/[?&](?:query|q)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (queryMatch) {
    return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) }
  }

  // 2. Degrees Minutes Seconds (DMS) format:
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NSns])[,+\s]+(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EWew])/
  const dmsMatch = str.match(dmsRegex)
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1])
    const latMin = parseFloat(dmsMatch[2])
    const latSec = parseFloat(dmsMatch[3])
    const latDir = dmsMatch[4].toUpperCase()

    const lngDeg = parseFloat(dmsMatch[5])
    const lngMin = parseFloat(dmsMatch[6])
    const lngSec = parseFloat(dmsMatch[7])
    const lngDir = dmsMatch[8].toUpperCase()

    let lat = latDeg + latMin / 60 + latSec / 3600
    if (latDir === 'S') lat = -lat

    let lng = lngDeg + lngMin / 60 + lngSec / 3600
    if (lngDir === 'W') lng = -lng

    return { lat, lng }
  }

  // 3. Plain decimal lat, lng:
  const decimalMatch = str.match(/^(-?\d+\.\d{3,})[,\s]+(-?\d+\.\d{3,})$/)
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1])
    const lng = parseFloat(decimalMatch[2])
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng }
    }
  }

  return null
}

function LocationPickerModal({ isOpen, onClose, onSelectLocation, initialLocation = '' }) {
  const mapContainerRef = useRef(null)
  const searchInputRef = useRef(null)
  const googleMapInstanceRef = useRef(null)
  const googleMarkerRef = useRef(null)
  const googleGeocoderRef = useRef(null)
  const googleAutocompleteRef = useRef(null)
  const leafletMapRef = useRef(null)
  const leafletMarkerRef = useRef(null)

  // Active Map Engine: 'google' or 'fallback'
  const [mapEngine, setMapEngine] = useState('google')
  const [authFailed, setAuthFailed] = useState(false)

  // API Key State
  const [apiKey, setApiKey] = useState(getStoredGoogleApiKey)
  const [keyInput, setKeyInput] = useState('')
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)
  const [sdkLoading, setSdkLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)

  // Coordinates & Location details
  // Default coordinates: Kochi, Kerala luxury destination (10.0497° N, 76.6469° E)
  const [coords, setCoords] = useState({ lat: 10.0497, lng: 76.6469 })
  const [locationName, setLocationName] = useState(initialLocation || '')
  const [geocoding, setGeocoding] = useState(false)
  const [locatingCurrent, setLocatingCurrent] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Map view type for Google Maps: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'
  const [mapTypeId, setMapTypeId] = useState('roadmap')

  // Save new API Key
  const handleSaveApiKey = (newKey) => {
    const trimmed = (newKey || '').trim()
    if (!trimmed) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('layam_google_maps_api_key', trimmed)
    }
    setApiKey(trimmed)
    setShowKeyPrompt(false)
    setAuthFailed(false)
    setMapEngine('google')
    setStatusMsg('Google Maps API key saved. Re-initializing Google Maps...')
  }

  // Reverse geocode via Nominatim (OpenStreetMap) fallback
  const reverseGeocodeNominatim = (pos) => {
    setGeocoding(true)
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`)
      .then((r) => r.json())
      .then((data) => {
        setGeocoding(false)
        if (data && data.display_name) {
          setLocationName(data.display_name)
        } else {
          setLocationName(`Location (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`)
        }
      })
      .catch(() => {
        setGeocoding(false)
        setLocationName(`Location (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`)
      })
  }

  // Global Google Maps Auth Failure hook
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prevAuthFailure = window.gm_authFailure
    window.gm_authFailure = () => {
      console.warn('Google Maps API key authentication error or required API not enabled in Google Cloud Console.')
      setAuthFailed(true)
      setMapEngine('fallback')
      setStatusMsg(
        'Notice: Your Google Maps key needs "Maps JavaScript API" and "Geocoding API" enabled in Google Cloud Console. Seamlessly displaying interactive OpenStreetMap so your venue picker works immediately!'
      )
      if (prevAuthFailure) prevAuthFailure()
    }
    return () => {
      window.gm_authFailure = prevAuthFailure
    }
  }, [])

  // 1. Load Google Maps SDK
  useEffect(() => {
    if (!isOpen) return

    const currentKey = apiKey || getStoredGoogleApiKey()
    if (!currentKey) {
      setMapEngine('fallback')
      setShowKeyPrompt(true)
      return
    }

    if (mapEngine === 'fallback') return

    setSdkLoading(true)
    setStatusMsg('Loading Google Maps SDK...')

    loadGoogleMapsSdk(currentKey)
      .then((gMaps) => {
        setSdkReady(true)
        setSdkLoading(false)
        setShowKeyPrompt(false)
        setStatusMsg('')
      })
      .catch((err) => {
        setSdkLoading(false)
        setAuthFailed(true)
        setMapEngine('fallback')
        setStatusMsg(`Google Maps unavailable (${err.message}). Seamlessly using interactive OpenStreetMap fallback.`)
      })
  }, [isOpen, apiKey, mapEngine])

  // 2. Initialize Map (Google Maps or Fallback Leaflet)
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    const initialCenter = { lat: coords.lat, lng: coords.lng }

    // If Google Maps is ready and selected
    if (mapEngine === 'google' && sdkReady && window.google?.maps && !authFailed) {
      try {
        // Destroy existing Leaflet map if any
        if (leafletMapRef.current) {
          leafletMapRef.current.remove()
          leafletMapRef.current = null
        }

        const gMaps = window.google.maps
        const map = new gMaps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 16,
          mapTypeId: mapTypeId,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: gMaps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: gMaps.ControlPosition.TOP_LEFT,
          },
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        })
        googleMapInstanceRef.current = map

        const marker = new gMaps.Marker({
          position: initialCenter,
          map,
          draggable: true,
          animation: gMaps.Animation.DROP,
          title: 'Selected Venue Location',
        })
        googleMarkerRef.current = marker

        const geocoder = new gMaps.Geocoder()
        googleGeocoderRef.current = geocoder

        const reverseGeocode = (pos) => {
          setGeocoding(true)
          geocoder.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setGeocoding(false)
              setLocationName(results[0].formatted_address)
            } else {
              // Fallback to Nominatim if Google Geocoder API is denied or unactivated
              reverseGeocodeNominatim(pos)
            }
          })
        }

        map.addListener('click', (e) => {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          const newPos = { lat, lng }
          setCoords(newPos)
          marker.setPosition(newPos)
          reverseGeocode(newPos)
        })

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          const newPos = { lat: pos.lat(), lng: pos.lng() }
          setCoords(newPos)
          reverseGeocode(newPos)
        })

        // Places Autocomplete
        if (searchInputRef.current && gMaps.places) {
          try {
            const autocomplete = new gMaps.places.Autocomplete(searchInputRef.current, {
              fields: ['name', 'formatted_address', 'geometry', 'place_id'],
            })
            googleAutocompleteRef.current = autocomplete

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace()
              if (!place.geometry || !place.geometry.location) {
                setStatusMsg(`No Google Places details found for "${searchInputRef.current.value}".`)
                return
              }
              const lat = place.geometry.location.lat()
              const lng = place.geometry.location.lng()
              const newPos = { lat, lng }
              setCoords(newPos)
              map.setCenter(newPos)
              map.setZoom(17)
              marker.setPosition(newPos)
              const fullName = place.name
                ? `${place.name}, ${place.formatted_address || ''}`.replace(/^, |, $/g, '')
                : place.formatted_address
              setLocationName(fullName)
              setStatusMsg(`✓ Selected venue from Google Places: ${place.name || place.formatted_address}`)
            })
          } catch (e) {
            console.warn('Google Places autocomplete setup notice:', e)
          }
        }

        // Parse initialLocation
        if (initialLocation) {
          const parsed = parseGoogleMapsOrCoordString(initialLocation)
          if (parsed) {
            setCoords(parsed)
            map.setCenter(parsed)
            map.setZoom(17)
            marker.setPosition(parsed)
            reverseGeocode(parsed)
          } else {
            setLocationName(initialLocation)
          }
        }

        return () => {
          if (googleAutocompleteRef.current && window.google?.maps?.event) {
            window.google.maps.event.clearInstanceListeners(googleAutocompleteRef.current)
          }
        }
      } catch (err) {
        console.warn('Google Map creation failed, falling back to Leaflet:', err)
        setMapEngine('fallback')
      }
    }

    // Leaflet OpenStreetMap Fallback
    if (mapEngine === 'fallback' || authFailed || !sdkReady) {
      if (googleMapInstanceRef.current) {
        googleMapInstanceRef.current = null
      }

      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }

      const lmap = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 16)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(lmap)

      const lmarker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(lmap)
      leafletMapRef.current = lmap
      leafletMarkerRef.current = lmarker

      lmap.on('click', (e) => {
        const { lat, lng } = e.latlng
        const newPos = { lat, lng }
        setCoords(newPos)
        lmarker.setLatLng(newPos)
        reverseGeocodeNominatim(newPos)
      })

      lmarker.on('dragend', () => {
        const pos = lmarker.getLatLng()
        const newPos = { lat: pos.lat, lng: pos.lng }
        setCoords(newPos)
        reverseGeocodeNominatim(newPos)
      })

      // Fix render timing in modal
      setTimeout(() => {
        lmap.invalidateSize()
      }, 200)

      if (initialLocation) {
        const parsed = parseGoogleMapsOrCoordString(initialLocation)
        if (parsed) {
          setCoords(parsed)
          lmap.setView([parsed.lat, parsed.lng], 16)
          lmarker.setLatLng([parsed.lat, parsed.lng])
          reverseGeocodeNominatim(parsed)
        } else {
          setLocationName(initialLocation)
        }
      }

      return () => {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove()
          leafletMapRef.current = null
        }
      }
    }
  }, [isOpen, mapEngine, sdkReady, authFailed])

  // Change Google Map Type
  const handleMapTypeChange = (type) => {
    setMapTypeId(type)
    if (googleMapInstanceRef.current && window.google?.maps) {
      googleMapInstanceRef.current.setMapTypeId(type)
    }
  }

  // Handle GPS / Current Location
  const handleGetCurrentLocation = () => {
    setStatusMsg('')
    if (!navigator.geolocation) {
      setStatusMsg('Geolocation is not supported by your browser.')
      return
    }

    setLocatingCurrent(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const newPos = { lat, lng }

        setCoords(newPos)

        if (mapEngine === 'google' && googleMapInstanceRef.current && googleMarkerRef.current) {
          googleMapInstanceRef.current.panTo(newPos)
          googleMapInstanceRef.current.setZoom(17)
          googleMarkerRef.current.setPosition(newPos)
        } else if (leafletMapRef.current && leafletMarkerRef.current) {
          leafletMapRef.current.setView([lat, lng], 16)
          leafletMarkerRef.current.setLatLng([lat, lng])
        }

        if (mapEngine === 'google' && googleGeocoderRef.current && !authFailed) {
          setGeocoding(true)
          googleGeocoderRef.current.geocode({ location: newPos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setGeocoding(false)
              setLocationName(results[0].formatted_address)
            } else {
              reverseGeocodeNominatim(newPos)
            }
          })
        } else {
          reverseGeocodeNominatim(newPos)
        }

        setLocatingCurrent(false)
        setStatusMsg(`✓ Centered to device GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      },
      (err) => {
        setLocatingCurrent(false)
        fetch('https://ipwho.is/')
          .then((r) => r.json())
          .then((data) => {
            if (data && data.success && data.latitude && data.longitude) {
              const newPos = { lat: data.latitude, lng: data.longitude }
              setCoords(newPos)
              if (mapEngine === 'google' && googleMapInstanceRef.current && googleMarkerRef.current) {
                googleMapInstanceRef.current.panTo(newPos)
                googleMapInstanceRef.current.setZoom(14)
                googleMarkerRef.current.setPosition(newPos)
              } else if (leafletMapRef.current && leafletMarkerRef.current) {
                leafletMapRef.current.setView([newPos.lat, newPos.lng], 14)
                leafletMarkerRef.current.setLatLng([newPos.lat, newPos.lng])
              }
              setLocationName(`${data.city || ''}, ${data.region || ''}, ${data.country || ''}`.replace(/^, |, $/g, ''))
              setStatusMsg(`📍 Centered to network approximate area (${data.city || 'Local area'}, ${data.region || ''}).`)
            } else {
              setStatusMsg('Unable to retrieve GPS or network coordinates.')
            }
          })
          .catch(() => {
            setStatusMsg('Location permission was denied. Please search venue above or click on map.')
          })
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    )
  }

  // Handle Search Form Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setStatusMsg('')

    // 1. Google Maps link or coordinates
    const parsedCoords = parseGoogleMapsOrCoordString(searchQuery)
    if (parsedCoords) {
      setCoords(parsedCoords)
      if (mapEngine === 'google' && googleMapInstanceRef.current && googleMarkerRef.current) {
        googleMapInstanceRef.current.panTo(parsedCoords)
        googleMapInstanceRef.current.setZoom(17)
        googleMarkerRef.current.setPosition(parsedCoords)
      } else if (leafletMapRef.current && leafletMarkerRef.current) {
        leafletMapRef.current.setView([parsedCoords.lat, parsedCoords.lng], 16)
        leafletMarkerRef.current.setLatLng([parsedCoords.lat, parsedCoords.lng])
      }

      if (mapEngine === 'google' && googleGeocoderRef.current && !authFailed) {
        setGeocoding(true)
        googleGeocoderRef.current.geocode({ location: parsedCoords }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setGeocoding(false)
            setLocationName(results[0].formatted_address)
          } else {
            reverseGeocodeNominatim(parsedCoords)
          }
        })
      } else {
        reverseGeocodeNominatim(parsedCoords)
      }

      setStatusMsg(`✓ Pinned location from coordinates: ${parsedCoords.lat.toFixed(5)}, ${parsedCoords.lng.toFixed(5)}`)
      return
    }

    // 2. Geocode search text
    if (mapEngine === 'google' && googleGeocoderRef.current && !authFailed) {
      setGeocoding(true)
      googleGeocoderRef.current.geocode({ address: searchQuery.trim() }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setGeocoding(false)
          const loc = results[0].geometry.location
          const newPos = { lat: loc.lat(), lng: loc.lng() }
          setCoords(newPos)
          if (googleMapInstanceRef.current && googleMarkerRef.current) {
            googleMapInstanceRef.current.panTo(newPos)
            googleMapInstanceRef.current.setZoom(17)
            googleMarkerRef.current.setPosition(newPos)
          }
          setLocationName(results[0].formatted_address)
          setStatusMsg(`✓ Found venue: ${results[0].formatted_address}`)
        } else {
          // Fallback search to Nominatim
          searchWithNominatim(searchQuery)
        }
      })
    } else {
      searchWithNominatim(searchQuery)
    }
  }

  const searchWithNominatim = (query) => {
    setGeocoding(true)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}`)
      .then((r) => r.json())
      .then((results) => {
        setGeocoding(false)
        if (results && results.length > 0) {
          const item = results[0]
          const newPos = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) }
          setCoords(newPos)
          if (leafletMapRef.current && leafletMarkerRef.current) {
            leafletMapRef.current.setView([newPos.lat, newPos.lng], 16)
            leafletMarkerRef.current.setLatLng([newPos.lat, newPos.lng])
          } else if (googleMapInstanceRef.current && googleMarkerRef.current) {
            googleMapInstanceRef.current.panTo(newPos)
            googleMapInstanceRef.current.setZoom(16)
            googleMarkerRef.current.setPosition(newPos)
          }
          setLocationName(item.display_name)
          setStatusMsg(`✓ Found location: ${item.display_name}`)
        } else {
          setStatusMsg(`No map locations found for "${query}". Try searching with city or landmark name.`)
        }
      })
      .catch(() => {
        setGeocoding(false)
        setStatusMsg('Search service unavailable. You can click anywhere on the map to pin your location.')
      })
  }

  // Confirm and Apply Location
  const handleConfirm = () => {
    const finalLocation = locationName.trim() || `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
    onSelectLocation(finalLocation, coords)
    onClose()
  }

  if (!isOpen) return null

  const googleMapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`

  return (
    <div className="loc-picker-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="loc-picker-modal fade-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="loc-picker-header">
          <div>
            <span className="loc-picker-eyebrow">Interactive Venue &amp; Geolocation Map</span>
            <h2 className="loc-picker-title">
              {mapEngine === 'google' && !authFailed ? 'Pick Location with Google Maps' : 'Pick Location (Interactive Map)'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Engine Toggle */}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              onClick={() => {
                const nextEngine = mapEngine === 'google' ? 'fallback' : 'google'
                setMapEngine(nextEngine)
                if (nextEngine === 'google') setAuthFailed(false)
              }}
              title="Toggle between Google Maps and OpenStreetMap view"
            >
              🔄 Engine: {mapEngine === 'google' && !authFailed ? 'Google Maps' : 'OpenStreetMap'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              onClick={() => setShowKeyPrompt(!showKeyPrompt)}
              title="View or update Google Maps API Key"
            >
              🔑 Google Key {apiKey ? '✓' : '!'}
            </button>
            <button
              type="button"
              className="loc-picker-close-btn"
              onClick={onClose}
              aria-label="Close location picker"
            >
              &times;
            </button>
          </div>
        </div>

        {/* API Key Entry Box (if toggled or key not set) */}
        {showKeyPrompt && (
          <div className="loc-picker-key-card">
            <div className="loc-picker-key-header">
              <strong>🔑 Google Maps API Key Setup</strong>
              <small>
                Enter your Google Maps API key with <em>Maps JavaScript API</em> and <em>Geocoding API</em> enabled in Google Cloud Console.
              </small>
            </div>
            <div className="loc-picker-key-form">
              <input
                type="password"
                className="loc-picker-search-input"
                placeholder="Paste your Google Maps API Key here (AIzaSy...)"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-gold"
                disabled={!keyInput.trim()}
                onClick={() => handleSaveApiKey(keyInput)}
              >
                Save &amp; Activate Google Map
              </button>
            </div>
          </div>
        )}

        {/* Toolbar: Search input & GPS button */}
        <div className="loc-picker-toolbar">
          <form className="loc-picker-search-form" onSubmit={handleSearchSubmit}>
            <input
              ref={searchInputRef}
              type="text"
              className="loc-picker-search-input"
              placeholder="Search venue name, address or paste Google Maps coordinates (e.g. 10°02'59.2&quot;N 76°38'48.9&quot;E)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-sm btn-outline loc-picker-search-btn"
              disabled={geocoding}
            >
              🔍 Locate
            </button>
          </form>

          <button
            type="button"
            className="btn btn-sm btn-gold loc-picker-gps-btn"
            onClick={handleGetCurrentLocation}
            disabled={locatingCurrent}
            title="Use device GPS location"
          >
            <span>{locatingCurrent ? '📍 Locating GPS...' : '📍 Use Current Location'}</span>
          </button>
        </div>

        {/* Layer Controls & External Google Maps Link */}
        <div className="loc-picker-layers-bar">
          <span className="loc-picker-layers-label">View Style:</span>
          {mapEngine === 'google' && !authFailed ? (
            <div className="loc-picker-layers-group">
              <button
                type="button"
                className={`loc-layer-btn ${mapTypeId === 'roadmap' ? 'is-active' : ''}`}
                onClick={() => handleMapTypeChange('roadmap')}
              >
                🗺️ Roadmap
              </button>
              <button
                type="button"
                className={`loc-layer-btn ${mapTypeId === 'satellite' ? 'is-active' : ''}`}
                onClick={() => handleMapTypeChange('satellite')}
              >
                🛰️ Satellite
              </button>
              <button
                type="button"
                className={`loc-layer-btn ${mapTypeId === 'hybrid' ? 'is-active' : ''}`}
                onClick={() => handleMapTypeChange('hybrid')}
              >
                🌐 Hybrid
              </button>
              <button
                type="button"
                className={`loc-layer-btn ${mapTypeId === 'terrain' ? 'is-active' : ''}`}
                onClick={() => handleMapTypeChange('terrain')}
              >
                ⛰️ Terrain
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #aaa)' }}>
              OpenStreetMap High-Resolution Interactive Cartography
            </span>
          )}

          <a
            href={googleMapsExternalUrl}
            target="_blank"
            rel="noreferrer"
            className="loc-picker-top-gmaps-link"
            title="Open selected pin directly on Google Maps website"
          >
            Open in Google Maps ↗
          </a>
        </div>

        {/* Status or Search Feedback Alert */}
        {statusMsg && (
          <div className="loc-picker-alert" role="alert">
            <span>ℹ️</span> {statusMsg}
          </div>
        )}

        {/* Map Canvas Container */}
        <div className="loc-picker-map-wrap">
          {sdkLoading && (
            <div className="loc-picker-loading-overlay">
              <div className="loc-picker-spinner-large"></div>
              <span>Connecting to Map Provider...</span>
            </div>
          )}

          <div ref={mapContainerRef} className="loc-picker-map-canvas" />

          <div className="loc-picker-map-hint">
            <span>💡 Click anywhere on the map or drag the pin to select exact venue position</span>
          </div>
        </div>

        {/* Footer & Location Confirmation */}
        <div className="loc-picker-footer">
          <div className="loc-picker-selection-info">
            <label htmlFor="final-location-input">Selected Location Address</label>
            <div className="loc-picker-input-group">
              <input
                id="final-location-input"
                type="text"
                className="loc-picker-location-input"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={geocoding ? 'Locating address...' : 'Enter or fine-tune venue name'}
              />
              {geocoding && <span className="loc-picker-spinner" title="Geocoding...">⏳</span>}
            </div>
            <div className="loc-picker-meta-links">
              <span className="loc-picker-coords">
                Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
              </span>
              <a
                href={googleMapsExternalUrl}
                target="_blank"
                rel="noreferrer"
                className="loc-picker-gmaps-link"
                title="View coordinates in Google Maps"
              >
                View Pin on Google Maps ↗
              </a>
            </div>
          </div>

          <div className="loc-picker-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-gold hover-elevate"
              onClick={handleConfirm}
              disabled={geocoding || locatingCurrent}
            >
              ✓ Confirm &amp; Apply Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationPickerModal
