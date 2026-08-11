import { useEffect, useMemo, useState } from 'react'
import FormField from '../components/FormField.jsx'
import DynamicTable from '../components/DynamicTable.jsx'
import PhotoUploader from '../components/PhotoUploader.jsx'
import DocumentManager from '../components/DocumentManager.jsx'
import GeoCapture from '../components/GeoCapture.jsx'
import { getTemplate } from '../engine/bankTemplates.js'
import {
  applySiteAddressCopy,
  computeCalculatedFields,
  initDynamicTables,
  initFormData,
  isFieldVisible,
  isSectionVisible,
  validateForm,
} from '../engine/fieldEngine.js'

const DRAFT_KEY = (jobId) => `property-draft-${jobId}`

function PropertyCaseForm({ job, onSubmit, onSaveDraft, onBack, onGenerateReport }) {
  const bankCode = job?.bankCode || 'UJJ'
  const template = useMemo(() => getTemplate(bankCode), [bankCode])

  const [formData, setFormData] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).formData } catch {}
    }
    const init = initFormData(template)
    return {
      ...init,
      applicantName: job?.customer || '',
      branchName: job?.branch || '',
      siteAddress: job?.location || '',
      valuerName: 'Er. V. Ramesh Babu B.E.,(Civil)',
    }
  })

  const [dynamicTables, setDynamicTables] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).dynamicTables } catch {}
    }
    return initDynamicTables(template)
  })

  const [photos, setPhotos] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).photos } catch {}
    }
    return job?.sitePhotos || []
  })

  const [documents, setDocuments] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).documents } catch {}
    }
    return job?.documents || []
  })

  const [gps, setGps] = useState({ latitude: '', longitude: '', accuracy: '', gpsTimestamp: '' })
  const [declaration, setDeclaration] = useState(true)
  const [validationErrors, setValidationErrors] = useState([])
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('')

  // Compute calculated fields
  const { computed, updatedTables } = useMemo(
    () => computeCalculatedFields(formData, dynamicTables),
    [formData, dynamicTables]
  )

  useEffect(() => {
    setDynamicTables((prev) => ({ ...prev, ...updatedTables }))
  }, [JSON.stringify(updatedTables)])

  // Auto-save draft
  useEffect(() => {
    const draft = { formData, dynamicTables, photos, documents, gps, savedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY(job?.id), JSON.stringify(draft))
  }, [formData, dynamicTables, photos, documents, gps])

  const updateField = (key, value) => {
    let updated = { ...formData, [key]: value }
    if (key === 'siteAddrSameAsDoc' && (value === true || value === 'true')) {
      updated = applySiteAddressCopy(updated)
    }
    setFormData(updated)
  }

  const handleSaveDraft = () => {
    const draft = { formData, dynamicTables, photos, documents, gps }
    localStorage.setItem(DRAFT_KEY(job?.id), JSON.stringify(draft))
    if (onSaveDraft) onSaveDraft(draft)
    setMessage({ text: 'Data saved successfully!', type: 'success' })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault()
    const errors = validateForm(template, computed, dynamicTables, photos, documents)
    if (errors.length > 0) {
      setValidationErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        formData: computed,
        dynamicTables,
        photos,
        documents,
        gps,
        declaration: true,
        templateId: template.templateId,
        templateVersion: template.version,
      })
      localStorage.removeItem(DRAFT_KEY(job?.id))
      setMessage({ text: 'Property verification details saved & submitted!', type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadReport = async () => {
    if (onGenerateReport) {
      try {
        await onGenerateReport(job.id, {
          ...computed,
          sitePhotos: photos,
          documents,
          dynamicTables,
        })
        setMessage({ text: 'Report generated and download started!', type: 'success' })
      } catch (err) {
        setMessage({ text: err.message, type: 'error' })
      }
    }
  }

  const scrollToSection = (id) => {
    setActiveSectionId(id)
    const el = document.getElementById(`sec-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!template) {
    return <div className="card" style={{ padding: 40, textAlign: 'center' }}>No template found for bank: {bankCode}</div>
  }

  return (
    <div className="property-form-shell">
      {/* ─── Top Sticky Bar ─── */}
      <div className="open-form-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button type="button" className="secondary-btn" onClick={onBack} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              ← Back
            </button>
          )}
          <div>
            <div className="step-bank-name">{template.bankName}</div>
            <div className="step-case-name">{job?.customer || 'Customer'} — {job?.branch || 'Branch'}</div>
          </div>
        </div>

        <div className="btn-group">
          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
            💾 Save Draft
          </button>
          {onGenerateReport && (
            <button type="button" className="btn btn-success" onClick={handleDownloadReport}>
              📊 Download Report (Excel)
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleFormSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : '✅ Save & Submit Case'}
          </button>
        </div>
      </div>

      {/* ─── Quick Jump Section Tabs ─── */}
      <div className="open-form-nav-tabs">
        {template.sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            className={`open-nav-tab ${activeSectionId === sec.id ? 'active' : ''}`}
            onClick={() => scrollToSection(sec.id)}
          >
            <span>{sec.icon}</span>
            <span>{sec.title}</span>
          </button>
        ))}
        <button type="button" className={`open-nav-tab ${activeSectionId === 'photos' ? 'active' : ''}`} onClick={() => scrollToSection('photos')}>
          <span>📷</span><span>Site Photos</span>
        </button>
        <button type="button" className={`open-nav-tab ${activeSectionId === 'documents' ? 'active' : ''}`} onClick={() => scrollToSection('documents')}>
          <span>📑</span><span>Documents</span>
        </button>
        <button type="button" className={`open-nav-tab ${activeSectionId === 'gps' ? 'active' : ''}`} onClick={() => scrollToSection('gps')}>
          <span>📍</span><span>GPS Location</span>
        </button>
      </div>

      {/* ─── Messages ─── */}
      {message && (
        <div className={`notice notice-${message.type}`} style={{ marginBottom: 20 }}>
          {message.text}
          <button type="button" className="notice-close" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* ─── Validation Errors ─── */}
      {validationErrors.length > 0 && (
        <div className="card" style={{ border: '2px solid var(--red-400)', marginBottom: 20 }}>
          <div className="card-header" style={{ background: 'var(--red-50)' }}>
            <h3 style={{ color: 'var(--red-700)' }}>⚠ {validationErrors.length} required fields need attention</h3>
            <button type="button" onClick={() => setValidationErrors([])} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {validationErrors.map((err, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: 'var(--red-700)', cursor: 'pointer' }} onClick={() => scrollToSection(err.section)}>
                  • <strong>[{err.section}]</strong> {err.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ALL SECTIONS OPEN CARDS LAYOUT ─── */}
      <form onSubmit={handleFormSubmit} className="open-sections-stack">
        {template.sections.map((section) => {
          if (!isSectionVisible(section, formData)) return null
          return (
            <div key={section.id} id={`sec-${section.id}`} className="card open-section-card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.3rem' }}>{section.icon}</span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{section.title}</h3>
                    {section.bankSpecific && (
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginTop: 3 }}>
                        {template.bankName} Specific
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-body">
                {section.type === 'dynamic-table' ? (
                  <DynamicTable
                    section={section}
                    rows={dynamicTables[section.id] || []}
                    onChange={(rows) => setDynamicTables((prev) => ({ ...prev, [section.id]: rows }))}
                  />
                ) : (
                  <div className="property-fields-grid">
                    {(section.fields || []).map((field) => {
                      if (!isFieldVisible(field, formData)) return null
                      const isRequired = field.required
                      const hasError = validationErrors.some((e) => e.field === field.key)
                      return (
                        <div key={field.key} className={`property-field-row ${field.type === 'textarea' ? 'full-width' : ''} ${hasError ? 'field-error' : ''}`}>
                          <label className="property-field-label">
                            {field.label}
                            {isRequired && <span className="required">*</span>}
                          </label>
                          <FormField
                            field={field}
                            value={formData[field.key]}
                            onChange={updateField}
                            computedValues={computed}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ─── Photos Section Card ─── */}
        <div id="sec-photos" className="card open-section-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.3rem' }}>📷</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Site Property Photos</h3>
            </div>
          </div>
          <div className="card-body">
            <PhotoUploader
              photoCategories={template.photoCategories}
              photos={photos}
              onChange={setPhotos}
            />
          </div>
        </div>

        {/* ─── Documents Section Card ─── */}
        <div id="sec-documents" className="card open-section-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.3rem' }}>📑</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Document Management</h3>
            </div>
          </div>
          <div className="card-body">
            <DocumentManager
              documentCategories={template.documentCategories}
              documents={documents}
              onChange={setDocuments}
            />
          </div>
        </div>

        {/* ─── GPS Section Card ─── */}
        <div id="sec-gps" className="card open-section-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.3rem' }}>📍</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>GPS Location Capture</h3>
            </div>
          </div>
          <div className="card-body">
            <GeoCapture
              latitude={gps.latitude}
              longitude={gps.longitude}
              accuracy={gps.accuracy}
              onCapture={(coords) => setGps((prev) => ({ ...prev, ...coords }))}
            />
          </div>
        </div>

        {/* ─── Declaration Section Card ─── */}
        <div id="sec-declaration" className="card open-section-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.3rem' }}>✍️</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Declaration & Valuer Sign-off</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="declaration-text">
              <p style={{ lineHeight: 1.8, color: 'var(--gray-700)', fontSize: '0.88rem' }}>
                {template.declarationText}
              </p>
            </div>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              <div className="form-field">
                <label className="property-field-label">Valuer Name</label>
                <input className="form-input" value={formData.valuerName || ''} onChange={(e) => updateField('valuerName', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="property-field-label">Date</label>
                <input className="form-input" type="date" value={new Date().toISOString().split('T')[0]} readOnly />
              </div>
              <div className="form-field">
                <label className="property-field-label">Place</label>
                <input className="form-input" value={formData.place || ''} onChange={(e) => updateField('place', e.target.value)} placeholder="Place of signing" />
              </div>
            </div>
            <label className="declaration-accept">
              <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} />
              <span>I accept the above declaration and certify that all property verification details provided are true and correct.</span>
            </label>
          </div>
        </div>

        {/* ─── Bottom Save Action Bar ─── */}
        <div className="open-form-bottombar">
          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
            💾 Save Draft
          </button>
          {onGenerateReport && (
            <button type="button" className="btn btn-success btn-lg" onClick={handleDownloadReport}>
              📊 Generate & Download Excel Report
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Saving Case Details...' : '✅ Save & Submit Property Case'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PropertyCaseForm
