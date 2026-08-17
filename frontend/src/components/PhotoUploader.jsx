import { useRef, useState, useEffect } from 'react'
import { mediaUrl, handleImageError, openFileUrl } from '../services/media.js'

/**
 * PhotoUploader — categorized site photos with drag-drop, camera, GPS, and rich preview gallery
 */
function PhotoUploader({ photoCategories, photos, onChange }) {
  const fileInputRef = useRef(null)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null) // index in filtered list

  const uploadFiles = async (files, category) => {
    if (!files || !files.length) return
    setUploading(true)
    const now = new Date()
    const targetCat = category === 'ALL' ? (photoCategories[0]?.key || 'FRONT_ELEVATION') : category

    // 1. Create instant local blob previews for 0ms latency display
    const tempPhotos = Array.from(files).map((f) => ({
      previewUrl: URL.createObjectURL(f),
      category: targetCat,
      caption: '',
      timestamp: now.toISOString(),
      name: f.name,
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }))

    const initialPhotos = [...photos, ...tempPhotos]
    onChange(initialPhotos)

    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append('photos', f))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success && data.files?.length) {
        // 2. Replace temp entries with server upload paths
        const uploadedFiles = data.files
        const updated = initialPhotos.map((p) => {
          const matchIdx = tempPhotos.findIndex((t) => t.tempId === p.tempId)
          if (matchIdx !== -1 && uploadedFiles[matchIdx]) {
            const u = uploadedFiles[matchIdx]
            const serverUrl = u.url || u.path || `/uploads/${u.filename}`
            return {
              ...p,
              ...u,
              url: serverUrl,
              previewUrl: serverUrl,
            }
          }
          return p
        })
        onChange(updated)
      }
    } catch (err) {
      console.error('Upload server sync failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (idx) => {
    onChange(photos.filter((_, i) => i !== idx))
    if (lightboxIndex !== null) setLightboxIndex(null)
  }

  const updateCaption = (idx, caption) => {
    onChange(photos.map((p, i) => i === idx ? { ...p, caption } : p))
  }

  const photosByCategory = (catKey) => photos.filter((p) => p.category === catKey)
  const totalRequired = photoCategories.filter((c) => c.mandatory).length
  const totalCaptured = photoCategories.filter((c) => c.mandatory && photosByCategory(c.key).length > 0).length

  const filteredPhotos = activeCategory === 'ALL' 
    ? photos 
    : photos.filter((p) => p.category === activeCategory)

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight' && filteredPhotos.length > 0) {
        setLightboxIndex((prev) => (prev + 1) % filteredPhotos.length)
      }
      if (e.key === 'ArrowLeft' && filteredPhotos.length > 0) {
        setLightboxIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, filteredPhotos.length])

  const selectedPhoto = lightboxIndex !== null && filteredPhotos[lightboxIndex] ? filteredPhotos[lightboxIndex] : null

  return (
    <div className="photo-uploader">
      {/* Progress bar */}
      <div className="photo-progress-wrapper">
        <div className="photo-progress-header">
          <span>Mandatory photos captured: <strong>{totalCaptured} / {totalRequired}</strong></span>
          <span>Total attached: <strong>{photos.length} photos</strong></span>
        </div>
        <div className="photo-progress-bar">
          <div
            className="photo-progress-fill"
            style={{ width: `${totalRequired ? (totalCaptured / totalRequired) * 100 : 100}%` }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="photo-category-tabs">
        <button
          type="button"
          className={`photo-cat-tab ${activeCategory === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveCategory('ALL')}
        >
          📷 All Photos
          <span className="photo-count-badge">{photos.length}</span>
        </button>

        {photoCategories.map((cat) => {
          const count = photosByCategory(cat.key).length
          const hasMandatory = cat.mandatory && count === 0
          return (
            <button
              key={cat.key}
              type="button"
              className={`photo-cat-tab ${activeCategory === cat.key ? 'active' : ''} ${hasMandatory ? 'missing' : count > 0 ? 'done' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
              {cat.mandatory && <span className="req-star">*</span>}
              {count > 0 && <span className="photo-count-badge">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Upload Zone */}
      <div
        className="photo-drop-zone"
        onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files, activeCategory) }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="photo-drop-icon">{uploading ? '⏳' : '📸'}</div>
        <div className="photo-drop-text">
          {uploading
            ? <span className="photo-uploading-text">Uploading and processing photos...</span>
            : <><strong>Click or Drag &amp; Drop</strong> to upload <strong>{activeCategory === 'ALL' ? 'site' : photoCategories.find((c) => c.key === activeCategory)?.label}</strong> photos</>
          }
        </div>
        <div className="photo-drop-hint">JPG, PNG, HEIC, WEBP · Auto-compressed · Instant Preview</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => uploadFiles(e.target.files, activeCategory)}
          disabled={uploading}
        />
      </div>

      {/* Photo Grid Preview */}
      {filteredPhotos.length > 0 ? (
        <div className="photo-preview-grid">
          {filteredPhotos.map((photo, idx) => {
            const globalIdx = photos.findIndex((p) => p === photo)
            const catInfo = photoCategories.find((c) => c.key === photo.category)
            const photoSrc = mediaUrl(photo)

            return (
              <div key={photo.url || photo.tempId || idx} className="photo-preview-card">
                {/* Thumbnail with hover zoom overlay */}
                <div
                  className="photo-img-wrapper"
                  onClick={() => setLightboxIndex(idx)}
                  title="Click to view full size in lightbox"
                >
                  <img
                    src={photoSrc}
                    alt={photo.caption || catInfo?.label || 'Site photo'}
                    className="photo-preview-img"
                    onError={handleImageError}
                    loading="lazy"
                  />
                  {/* Category badge */}
                  <span className="photo-preview-badge">
                    {catInfo?.label || photo.category || 'Site Photo'}
                  </span>

                  {/* Hover action overlay */}
                  <div className="photo-preview-overlay">
                    <span className="photo-zoom-btn">🔍 View Fullscreen</span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    className="photo-preview-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePhoto(globalIdx)
                    }}
                    title="Delete photo"
                  >
                    ✕
                  </button>
                </div>

                {/* Details / Caption / Timestamp footer */}
                <div className="photo-preview-details">
                  <input
                    type="text"
                    className="photo-caption-input"
                    value={photo.caption || ''}
                    onChange={(e) => updateCaption(globalIdx, e.target.value)}
                    placeholder="Add caption or note..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="photo-preview-meta">
                    <span className="photo-preview-time">
                      🕒 {photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                    <button
                      type="button"
                      className="photo-preview-action-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLightboxIndex(idx)
                      }}
                    >
                      Enlarge ↗
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="photo-empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📷</div>
          <p style={{ fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 4px 0' }}>
            No photos in {activeCategory === 'ALL' ? 'any category' : `"${photoCategories.find((c) => c.key === activeCategory)?.label}"`} yet
          </p>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
            Use the upload box above to capture or attach photos.
          </span>
          {activeCategory !== 'ALL' && photoCategories.find((c) => c.key === activeCategory)?.mandatory && (
            <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 8, fontSize: '0.85rem' }}>
              ⚠ This photo category is mandatory for verification
            </div>
          )}
        </div>
      )}

      {/* ─── Rich Lightbox Modal ─── */}
      {selectedPhoto && (
        <div className="photo-lightbox" onClick={() => setLightboxIndex(null)}>
          <div className="photo-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {/* Lightbox Header */}
            <div className="photo-lightbox-header">
              <div className="photo-lightbox-title">
                <span className="photo-lightbox-cat">
                  {photoCategories.find((c) => c.key === selectedPhoto.category)?.label || selectedPhoto.category || 'Photo'}
                </span>
                <span className="photo-lightbox-counter">
                  {lightboxIndex + 1} / {filteredPhotos.length}
                </span>
              </div>
              <div className="photo-lightbox-actions">
                {selectedPhoto.url && (
                  <button
                    type="button"
                    className="photo-lightbox-btn"
                    onClick={() => openFileUrl(selectedPhoto.url)}
                    title="Open original in new tab"
                  >
                    🔗 Original
                  </button>
                )}
                <button
                  type="button"
                  className="photo-lightbox-close"
                  onClick={() => setLightboxIndex(null)}
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Lightbox Main Image & Nav */}
            <div className="photo-lightbox-body">
              {filteredPhotos.length > 1 && (
                <button
                  type="button"
                  className="photo-lightbox-nav photo-lightbox-prev"
                  onClick={() => setLightboxIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length)}
                  title="Previous (Left Arrow)"
                >
                  ❮
                </button>
              )}

              <div className="photo-lightbox-img-box">
                <img
                  src={mediaUrl(selectedPhoto)}
                  alt={selectedPhoto.caption || 'Site photo'}
                  className="photo-lightbox-img"
                  onError={handleImageError}
                />
              </div>

              {filteredPhotos.length > 1 && (
                <button
                  type="button"
                  className="photo-lightbox-nav photo-lightbox-next"
                  onClick={() => setLightboxIndex((prev) => (prev + 1) % filteredPhotos.length)}
                  title="Next (Right Arrow)"
                >
                  ❯
                </button>
              )}
            </div>

            {/* Lightbox Footer with Caption */}
            <div className="photo-lightbox-footer">
              <div className="photo-lightbox-caption">
                {selectedPhoto.caption ? (
                  <strong>{selectedPhoto.caption}</strong>
                ) : (
                  <span style={{ fontStyle: 'italic', opacity: 0.7 }}>No caption entered</span>
                )}
                {selectedPhoto.timestamp && (
                  <span className="photo-lightbox-timestamp">
                    Captured: {new Date(selectedPhoto.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoUploader
