import { useRef, useState } from 'react'
import { mediaUrl, handleImageError } from '../services/media.js'

/**
 * PhotoUploader — categorized site photos with drag-drop, camera, GPS, preview
 */
function PhotoUploader({ photoCategories, photos, onChange }) {
  const fileInputRef = useRef(null)
  const [activeCategory, setActiveCategory] = useState(photoCategories[0]?.key || '')
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null) // for lightbox

  const uploadFiles = async (files, category) => {
    if (!files || !files.length) return
    setUploading(true)
    const now = new Date()

    // 1. Create instant local blob previews for 0ms latency display
    const tempPhotos = Array.from(files).map((f) => ({
      previewUrl: URL.createObjectURL(f),
      category,
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
  }

  const updateCaption = (idx, caption) => {
    onChange(photos.map((p, i) => i === idx ? { ...p, caption } : p))
  }

  const photosByCategory = (catKey) => photos.filter((p) => p.category === catKey)
  const totalRequired = photoCategories.filter((c) => c.mandatory).length
  const totalCaptured = photoCategories.filter((c) => c.mandatory && photosByCategory(c.key).length > 0).length

  return (
    <div className="photo-uploader">
      {/* Progress bar */}
      <div className="photo-progress-bar">
        <div className="photo-progress-fill" style={{ width: `${totalRequired ? (totalCaptured / totalRequired) * 100 : 100}%` }} />
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 16 }}>
        Mandatory photos captured: <strong>{totalCaptured} / {totalRequired}</strong> · Total uploaded: <strong>{photos.length}</strong>
      </div>

      {/* Category tabs */}
      <div className="photo-category-tabs">
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
        <div className="photo-drop-icon">{uploading ? '⏳' : '📷'}</div>
        <div className="photo-drop-text">
          {uploading
            ? 'Uploading...'
            : <><strong>Tap or drag</strong> to upload <strong>{photoCategories.find((c) => c.key === activeCategory)?.label}</strong> photos</>
          }
        </div>
        <div className="photo-drop-hint">JPG, PNG, HEIC · Max 10 MB each</div>
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

      {/* Photo grid for active category */}
      {photosByCategory(activeCategory).length > 0 && (
        <div className="photo-preview-grid" style={{ marginTop: 16 }}>
          {photosByCategory(activeCategory).map((photo, idx) => {
            const globalIdx = photos.findIndex((p) => p === photo)
            return (
              <div key={photo.url || idx} className="photo-preview-card">
                <img
                  src={mediaUrl(photo)}
                  alt={photo.caption || 'Site photo'}
                  onError={handleImageError}
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div style={{ padding: '6px 8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '4px 6px', marginBottom: 4 }}
                    value={photo.caption || ''}
                    onChange={(e) => updateCaption(globalIdx, e.target.value)}
                    placeholder="Add caption..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  {photo.timestamp && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>
                      {new Date(photo.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="photo-preview-remove"
                  onClick={() => removePhoto(globalIdx)}
                >×</button>
              </div>
            )
          })}
        </div>
      )}

      {photosByCategory(activeCategory).length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.88rem' }}>
          No photos uploaded for this category yet
          {photoCategories.find((c) => c.key === activeCategory)?.mandatory && (
            <div style={{ color: 'var(--red-500)', fontWeight: 600, marginTop: 4 }}>⚠ This photo is mandatory</div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="photo-lightbox" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="photo-lightbox-close" onClick={() => setSelectedPhoto(null)}>✕</button>
            <img src={mediaUrl(selectedPhoto)} alt={selectedPhoto.caption} onError={handleImageError} />
            {selectedPhoto.caption && <p className="photo-lightbox-caption">{selectedPhoto.caption}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoUploader
