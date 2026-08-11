import { useState } from 'react'

/**
 * GeoCapture — GPS location capture with coordinates display
 */
function GeoCapture({ latitude, longitude, accuracy, onCapture }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const capture = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        onCapture({
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy),
          gpsTimestamp: new Date().toISOString(),
        })
      },
      (err) => {
        setLoading(false)
        setError('Location access denied. Please allow location permissions.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const hasCaptured = latitude && longitude

  return (
    <div className="geo-capture-box">
      <button
        type="button"
        className={`btn ${hasCaptured ? 'btn-success' : 'btn-primary'} btn-lg`}
        onClick={capture}
        disabled={loading}
      >
        {loading ? '📡 Acquiring GPS...' : hasCaptured ? '📍 Re-capture GPS Location' : '📍 Capture Current GPS Location'}
      </button>

      {error && (
        <div className="notice notice-error" style={{ marginTop: 12 }}>{error}</div>
      )}

      {hasCaptured && (
        <div className="geo-captured-box">
          <div className="geo-status">
            <span className="geo-status-dot" />
            GPS Captured ✓
          </div>
          <div className="geo-coords">
            <div>
              <div className="geo-label">Latitude</div>
              <div className="geo-value">{latitude}</div>
            </div>
            <div>
              <div className="geo-label">Longitude</div>
              <div className="geo-value">{longitude}</div>
            </div>
            {accuracy && (
              <div>
                <div className="geo-label">Accuracy</div>
                <div className="geo-value">±{accuracy} m</div>
              </div>
            )}
          </div>
          {/* Static map preview */}
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="geo-map-link"
          >
            <div className="geo-map-preview">
              <iframe
                title="Map Preview"
                src={`https://maps.google.com/maps?q=${latitude},${longitude}&output=embed&zoom=16`}
                width="100%"
                height="200"
                style={{ border: 'none', borderRadius: 10 }}
                loading="lazy"
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--brand-600)', marginTop: 6 }}>
              🗺 Open in Google Maps
            </div>
          </a>
        </div>
      )}

      {/* Manual entry fallback */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-field">
          <label className="form-label">Latitude (manual)</label>
          <input
            className="form-input"
            type="text"
            value={latitude || ''}
            onChange={(e) => onCapture({ latitude: e.target.value, longitude: longitude || '', accuracy: accuracy || '' })}
            placeholder="e.g. 12.345678"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Longitude (manual)</label>
          <input
            className="form-input"
            type="text"
            value={longitude || ''}
            onChange={(e) => onCapture({ latitude: latitude || '', longitude: e.target.value, accuracy: accuracy || '' })}
            placeholder="e.g. 77.654321"
          />
        </div>
      </div>
    </div>
  )
}

export default GeoCapture
