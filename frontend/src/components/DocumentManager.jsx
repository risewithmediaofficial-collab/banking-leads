import { useRef, useState } from 'react'
import { mediaUrl, handleImageError } from '../services/media.js'

/**
 * DocumentManager — upload, categorize, verify, and preview property documents
 */
function DocumentManager({ documentCategories, documents, onChange }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [addingDoc, setAddingDoc] = useState(false)
  const [newDoc, setNewDoc] = useState({
    type: documentCategories[0] || '',
    number: '',
    docDate: '',
    verificationStatus: 'Verified',
    remarks: '',
    file: null,
    url: '',
    name: '',
  })

  const uploadFile = async (file) => {
    if (!file) return null
    const fd = new FormData()
    fd.append('photos', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    return data.success ? data.files[0] : null
  }

  const handleAddDocument = async () => {
    setUploading(true)
    try {
      let url = ''
      let name = ''
      if (newDoc.file) {
        const uploaded = await uploadFile(newDoc.file)
        if (uploaded) { url = uploaded.url; name = uploaded.name }
      }
      const doc = { ...newDoc, url, name, file: undefined }
      onChange([...documents, doc])
      setNewDoc({ type: documentCategories[0] || '', number: '', docDate: '', verificationStatus: 'Verified', remarks: '', file: null, url: '', name: '' })
      setAddingDoc(false)
    } catch (err) {
      console.error('Document upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = (idx) => {
    onChange(documents.filter((_, i) => i !== idx))
  }

  const updateDoc = (idx, field, value) => {
    onChange(documents.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const statusColor = { Verified: 'badge-green', 'Not Verified': 'badge-red', 'Not Available': 'badge-gray', 'Not Applicable': 'badge-amber' }

  return (
    <div className="document-manager">
      {/* Document list */}
      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', border: '2px dashed var(--gray-200)', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📄</div>
          <p>No documents added yet</p>
        </div>
      ) : (
        <div className="document-list">
          {documents.map((doc, idx) => (
            <div key={idx} className="document-row">
              <div className="document-row-main">
                <div className="document-icon">
                  {(doc.previewUrl || (doc.url && doc.url.match(/\.(jpg|jpeg|png|gif|heic)/i)))
                    ? <img src={mediaUrl(doc)} alt={doc.type} onError={handleImageError} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                    : <div style={{ width: 44, height: 44, background: 'var(--brand-50)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📄</div>
                  }
                </div>
                <div className="document-info">
                  <div className="document-type-name">{doc.type}</div>
                  {doc.number && <div className="document-meta">No: {doc.number}</div>}
                  {doc.docDate && <div className="document-meta">Date: {doc.docDate}</div>}
                  {doc.remarks && <div className="document-meta" style={{ color: 'var(--gray-500)' }}>{doc.remarks}</div>}
                </div>
                <div className="document-status">
                  <select
                    className="form-select"
                    style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                    value={doc.verificationStatus || 'Verified'}
                    onChange={(e) => updateDoc(idx, 'verificationStatus', e.target.value)}
                  >
                    <option value="Verified">Verified</option>
                    <option value="Not Verified">Not Verified</option>
                    <option value="Not Available">Not Available</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                {doc.url && (
                  <a
                    href={mediaUrl(doc.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-btn"
                    style={{ fontSize: '0.78rem', padding: '5px 10px', textDecoration: 'none' }}
                  >
                    View
                  </a>
                )}
                <button type="button" className="secondary-btn danger-btn" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={() => removeDoc(idx)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add document form */}
      {addingDoc ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-header">
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Add Document</h4>
            <button type="button" className="secondary-btn" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setAddingDoc(false)}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-field">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={newDoc.type} onChange={(e) => setNewDoc((p) => ({ ...p, type: e.target.value }))}>
                  {documentCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Document Number</label>
                <input className="form-input" value={newDoc.number} onChange={(e) => setNewDoc((p) => ({ ...p, number: e.target.value }))} placeholder="Doc number" />
              </div>
              <div className="form-field">
                <label className="form-label">Document Date</label>
                <input className="form-input" type="date" value={newDoc.docDate} onChange={(e) => setNewDoc((p) => ({ ...p, docDate: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Verification Status</label>
                <select className="form-select" value={newDoc.verificationStatus} onChange={(e) => setNewDoc((p) => ({ ...p, verificationStatus: e.target.value }))}>
                  <option value="Verified">Verified</option>
                  <option value="Not Verified">Not Verified</option>
                  <option value="Not Available">Not Available</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Remarks</label>
                <input className="form-input" value={newDoc.remarks} onChange={(e) => setNewDoc((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks" />
              </div>
              <div className="form-field">
                <label className="form-label">Attach File (optional)</label>
                <div
                  className="photo-drop-zone"
                  style={{ padding: '16px', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {newDoc.file
                    ? <span style={{ fontSize: '0.85rem', color: 'var(--green-600)' }}>📎 {newDoc.file.name}</span>
                    : <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>📂 Click to attach file / photo</span>
                  }
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={(e) => setNewDoc((p) => ({ ...p, file: e.target.files[0] || null }))}
                  />
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAddDocument} disabled={uploading}>
              {uploading ? 'Uploading...' : '+ Add Document'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setAddingDoc(true)}>
          + Add Document
        </button>
      )}
    </div>
  )
}

export default DocumentManager
