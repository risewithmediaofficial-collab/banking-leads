import { useEffect, useState } from 'react'
import PropertyCaseForm from './PropertyCaseForm.jsx'

const STATUS_FLOW = [
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'VISIT_STARTED', label: 'Visit Started' },
  { key: 'VISITED_SITE', label: 'Visited Site' },
  { key: 'DETAILS_UPDATED', label: 'Details Updated' },
  { key: 'SUBMITTED_FOR_VERIFICATION', label: 'Submitted' },
  { key: 'VERIFIED', label: 'Verified' },
]

const STATUS_BADGE = {
  ASSIGNED: 'badge-blue',
  VISIT_STARTED: 'badge-amber',
  VISITED_SITE: 'badge-amber',
  DETAILS_UPDATED: 'badge-purple',
  SUBMITTED_FOR_VERIFICATION: 'badge-blue',
  VERIFIED: 'badge-green',
  REVISION_REQUIRED: 'badge-red',
}

function StatusProgress({ status }) {
  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === status)
  return (
    <div className="status-progress">
      {STATUS_FLOW.map((step, idx) => {
        let cls = ''
        if (idx < currentIndex) cls = 'done'
        else if (idx === currentIndex) cls = 'current'
        return (
          <div key={step.key} className={`status-step ${cls}`}>
            <div className="step-circle">{idx < currentIndex ? '✓' : idx + 1}</div>
            <div className="step-label">{step.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function FieldDashboard({ user, jobs, bankTemplates, onSubmit, onSubmitVendorBill, onUpdateStatus, onGenerateReport, onRefresh }) {
  const [activeTab, setActiveTab] = useState('active')
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [mode, setMode] = useState('list') // 'list' | 'form'
  const [statusNote, setStatusNote] = useState('')
  const [message, setMessage] = useState(null)
  const [submittingBill, setSubmittingBill] = useState(false)

  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldFromDate, setFieldFromDate] = useState('')
  const [fieldToDate, setFieldToDate] = useState('')

  const parseDateToTimestamp = (dateVal) => {
    if (!dateVal) return null
    if (typeof dateVal === 'number') return dateVal
    if (dateVal instanceof Date) return dateVal.getTime()
    let str = String(dateVal).trim()
    if (!str) return null
    if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
      const [d, m, y] = str.split('.')
      return new Date(`${y}-${m}-${d}T00:00:00`).getTime()
    }
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) return parsed.getTime()
    return null
  }

  const isDateInRange = (dateVal, startDate, endDate) => {
    if (!startDate && !endDate) return true
    if (!dateVal) return false
    const itemTs = parseDateToTimestamp(dateVal)
    if (!itemTs) return false
    if (startDate) {
      const startTs = new Date(`${startDate}T00:00:00`).getTime()
      if (itemTs < startTs) return false
    }
    if (endDate) {
      const endTs = new Date(`${endDate}T23:59:59`).getTime()
      if (itemTs > endTs) return false
    }
    return true
  }

  const activeJobs = jobs.filter((j) => !['VERIFIED', 'COMPLETED'].includes(j.status))
  const completedJobs = jobs.filter((j) => ['VERIFIED', 'COMPLETED'].includes(j.status))
  const baseJobs = activeTab === 'active' ? activeJobs : completedJobs
  const displayedJobs = baseJobs.filter((j) => {
    if (!isDateInRange(j.initiationDate || j.createdAt || j.dueDate || j.visitedAt, fieldFromDate, fieldToDate)) return false
    if (fieldSearch.trim()) {
      const q = fieldSearch.toLowerCase()
      return (
        (j.customer || '').toLowerCase().includes(q) ||
        (j.bank || '').toLowerCase().includes(q) ||
        (j.branch || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q)
      )
    }
    return true
  })
  const selectedJob = jobs.find((j) => j.id === selectedJobId) || displayedJobs[0]

  // Vendor Bill local state per job
  const [billForm, setBillForm] = useState({
    customerId: '',
    opinionDate: new Date().toISOString().split('T')[0],
    opinionFee: 1500,
    additionalFee: 0,
    jobCardPrefix: 'K',
    jobCardNo: '',
    remarks: '',
  })

  useEffect(() => {
    if (selectedJob) {
      setSelectedJobId(selectedJob.id)
      const existing = selectedJob.vendorBillDetails || {}
      setBillForm({
        customerId: existing.customerId || selectedJob.customerAppNo || selectedJob.id || '',
        opinionDate: existing.opinionDate || new Date().toISOString().split('T')[0],
        opinionFee: existing.opinionFee !== undefined ? existing.opinionFee : 1500,
        additionalFee: existing.additionalFee || 0,
        jobCardPrefix: existing.jobCardPrefix || 'K',
        jobCardNo: existing.jobCardNo || '',
        remarks: existing.remarks || '',
      })
    }
  }, [selectedJob?.id])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleStatusUpdate = async (status) => {
    if (!selectedJob) return
    await onUpdateStatus(selectedJob.id, { status, statusNote })
    showMsg(`Status updated: ${status}`)
    onRefresh()
  }

  const handleSubmit = async (payload) => {
    if (!selectedJob) throw new Error('No job selected')
    await onSubmit(selectedJob.id, {
      ...payload.formData,
      applicantName: selectedJob.customer,
      branchName: selectedJob.branch,
      caseRefNo: selectedJob.id,
      occupantName: selectedJob.customer,
      sitePhotos: payload.photos,
      documents: payload.documents,
      gps: payload.gps,
      dynamicTables: payload.dynamicTables,
      templateId: payload.templateId,
      templateVersion: payload.templateVersion,
    })
    showMsg('Submitted for admin review!')
    setMode('list')
    onRefresh()
  }

  const handleVendorBillSubmit = async (e) => {
    e.preventDefault()
    if (!selectedJob) return
    setSubmittingBill(true)
    try {
      const opinionFee = Number(billForm.opinionFee) || 0
      const additionalFee = Number(billForm.additionalFee) || 0
      const totalAmount = opinionFee + additionalFee

      const payload = {
        ...billForm,
        customerName: selectedJob.customer,
        branch: selectedJob.branch || 'Branch',
        bankCode: selectedJob.bankCode || 'UJJ',
        bank: selectedJob.bank || 'Bank',
        amount: opinionFee,
        opinionFee,
        additionalFee,
        totalAmount,
        assignedEmployee: user.name,
      }

      if (onSubmitVendorBill) {
        await onSubmitVendorBill(selectedJob.id, payload)
      }
      showMsg('Vendor bill details submitted to Admin successfully!')
      onRefresh()
    } catch (err) {
      showMsg(err.message, 'error')
    } finally {
      setSubmittingBill(false)
    }
  }

  // ─── Property Case Form Mode ───
  if (mode === 'form' && selectedJob) {
    return (
      <div className="page-grid">
        <PropertyCaseForm
          job={selectedJob}
          onSubmit={handleSubmit}
          onSaveDraft={(draft) => showMsg('Draft saved')}
          onBack={() => setMode('list')}
        />
      </div>
    )
  }

  const totalBillAmount = (Number(billForm.opinionFee) || 0) + (Number(billForm.additionalFee) || 0)
  const isBillSubmitted = selectedJob?.vendorBillDetails?.submitted

  // ─── Task List Mode ───
  return (
    <div className="field-layout">
      {/* Left: Task List Panel */}
      <div className="field-task-panel">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem' }}>My Tasks</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{user.name}</p>
        </div>

        <div style={{ marginBottom: 10 }}>
          <input
            className="form-input"
            style={{ fontSize: '0.82rem', padding: '7px 12px' }}
            placeholder="🔍 Search my tasks..."
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            style={{ fontSize: '0.78rem', padding: '5px 8px', flex: 1, minWidth: 110 }}
            value={fieldFromDate}
            onChange={(e) => setFieldFromDate(e.target.value)}
            title="Filter from date"
          />
          <input
            type="date"
            className="form-input"
            style={{ fontSize: '0.78rem', padding: '5px 8px', flex: 1, minWidth: 110 }}
            value={fieldToDate}
            onChange={(e) => setFieldToDate(e.target.value)}
            title="Filter to date"
          />
          {(fieldFromDate || fieldToDate) && (
            <button
              type="button"
              className="secondary-btn"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              onClick={() => { setFieldFromDate(''); setFieldToDate('') }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="task-list-tabs">
          <button type="button" className={`task-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            Active ({activeJobs.length})
          </button>
          <button type="button" className={`task-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
            Done ({completedJobs.length})
          </button>
        </div>

        {displayedJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
            <p style={{ fontSize: '0.88rem' }}>No {activeTab} tasks</p>
          </div>
        ) : (
          displayedJobs.map((job) => (
            <div
              key={job.id}
              className={`task-card ${selectedJobId === job.id ? 'active-task' : ''}`}
              onClick={() => setSelectedJobId(job.id)}
            >
              <div className="task-card-customer">{job.customer}</div>
              <div className="task-card-bank">{job.bank} — {job.branch || 'Branch'}</div>
              <div className="task-card-footer">
                <span className={`badge ${STATUS_BADGE[job.status] || 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                  {job.status?.replace(/_/g, ' ')}
                </span>
                {job.vendorBillDetails?.submitted && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--green-600)', fontWeight: 700 }}>
                    🧾 Bill OK
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right: Task Detail Panel */}
      <div className="field-main-panel">
        {message && (
          <div className={`notice notice-${message.type}`} style={{ marginBottom: 20 }}>
            {message.text}
            <button type="button" className="notice-close" onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        {!selectedJob ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>📍</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select a task from the left panel</p>
            <p style={{ fontSize: '0.9rem', marginTop: 6 }}>Choose an assigned task to begin the property verification</p>
          </div>
        ) : (
          <>
            {/* Job Header */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Task #{selectedJob.id?.slice(-8)}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>{selectedJob.customer}</h3>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginTop: 4 }}>
                    {selectedJob.bank} · {selectedJob.branch} · {selectedJob.location}
                  </p>
                </div>
                <span className={`badge ${STATUS_BADGE[selectedJob.status] || 'badge-gray'}`} style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                  {selectedJob.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="card-body" style={{ paddingTop: 16 }}>
                <StatusProgress status={selectedJob.status} />
              </div>
            </div>

            {/* Quick Status Update */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3>Quick Status Update</h3></div>
              <div className="card-body">
                <div className="form-field" style={{ marginBottom: 12 }}>
                  <label className="form-label">Status Note</label>
                  <input className="form-input" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Note about current status..." />
                </div>
                <div className="btn-group">
                  <button type="button" className="btn btn-secondary" onClick={() => handleStatusUpdate('VISIT_STARTED')}>🚗 Start Visit</button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleStatusUpdate('VISITED_SITE')}>📍 Mark Visited</button>
                </div>
              </div>
            </div>

            {/* Main CTA — Open Full Form */}
            <div className="card" style={{ marginBottom: 20, border: '2px solid var(--brand-600)' }}>
              <div className="card-header">
                <div>
                  <h3 style={{ color: 'var(--brand-700)' }}>🏠 Property Verification Form</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 4 }}>
                    Fill complete property details — site measurements, boundaries, documents, photos, GPS, valuation. Auto-saved locally.
                  </p>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => setMode('form')}
                    disabled={['VERIFIED','COMPLETED'].includes(selectedJob.status)}
                  >
                    {selectedJob.status === 'SUBMITTED_FOR_VERIFICATION'
                      ? '✏️ Edit Submitted Form'
                      : '▶ Open Property Form'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onGenerateReport(selectedJob.id, { applicantName: selectedJob.customer, branchName: selectedJob.branch, caseRefNo: selectedJob.id, sitePhotos: selectedJob.sitePhotos || [] })}
                  >
                    📊 Download Report
                  </button>
                </div>

                {selectedJob.status === 'SUBMITTED_FOR_VERIFICATION' && (
                  <div className="notice notice-success" style={{ marginTop: 12 }}>
                    ✅ This case has been submitted for admin review.
                  </div>
                )}
                {selectedJob.status === 'REVISION_REQUIRED' && (
                  <div className="notice notice-error" style={{ marginTop: 12 }}>
                    ⚠ Admin has requested corrections. Please reopen the form and update.
                    {selectedJob.correctionRemarks && <div style={{ marginTop: 6, fontWeight: 700 }}>Remarks: {selectedJob.correctionRemarks}</div>}
                  </div>
                )}
                {selectedJob.status === 'VERIFIED' && (
                  <div className="notice notice-success" style={{ marginTop: 12 }}>
                    🎉 This case has been verified by admin. Report is ready.
                  </div>
                )}
              </div>
            </div>

            {/* 🧾 VENDOR BILL DETAILS FORM CARD (Assigned Employee Fills & Submits) */}
            <div className="card" style={{ marginBottom: 20, border: '2px solid var(--purple-500)' }}>
              <div className="card-header" style={{ background: 'var(--purple-50)' }}>
                <div>
                  <h3 style={{ color: 'var(--purple-600)', margin: 0 }}>🧾 Vendor Bill Details (Submit to Admin)</h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--gray-600)', marginTop: 4 }}>
                    Fill opinion fee, additional fee, and job card numbers for this case to submit for overall bank vendor bill report.
                  </p>
                </div>
                {isBillSubmitted && (
                  <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    ✓ Vendor Bill Submitted
                  </span>
                )}
              </div>
              <div className="card-body">
                {isBillSubmitted && (
                  <div className="notice notice-success" style={{ marginBottom: 16 }}>
                    ✅ Vendor bill details submitted to Admin! (Total Fee: ₹{totalBillAmount}, Job Card: {billForm.jobCardPrefix}-{billForm.jobCardNo || 'N/A'})
                  </div>
                )}
                <form onSubmit={handleVendorBillSubmit}>
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-field">
                      <label className="form-label">Branch</label>
                      <input className="form-input" value={selectedJob.branch || ''} readOnly style={{ background: 'var(--gray-100)' }} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Customer ID / App No.</label>
                      <input
                        className="form-input"
                        value={billForm.customerId}
                        onChange={(e) => setBillForm((p) => ({ ...p, customerId: e.target.value }))}
                        placeholder="Customer ID"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Customer Name</label>
                      <input className="form-input" value={selectedJob.customer || ''} readOnly style={{ background: 'var(--gray-100)' }} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Date of Opinion / Visit</label>
                      <input
                        className="form-input"
                        type="date"
                        value={billForm.opinionDate}
                        onChange={(e) => setBillForm((p) => ({ ...p, opinionDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-field">
                      <label className="form-label">Opinion Fee (Rs.)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={billForm.opinionFee}
                        onChange={(e) => setBillForm((p) => ({ ...p, opinionFee: e.target.value }))}
                        placeholder="1500"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Additional Fee (Rs.)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={billForm.additionalFee}
                        onChange={(e) => setBillForm((p) => ({ ...p, additionalFee: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Total Amount (Rs.)</label>
                      <input
                        className="form-input"
                        value={`₹${totalBillAmount}`}
                        readOnly
                        style={{ background: 'var(--green-50)', fontWeight: 800, color: 'var(--green-700)' }}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 16 }}>
                    <div className="form-field">
                      <label className="form-label">Job Card Prefix</label>
                      <input
                        className="form-input"
                        value={billForm.jobCardPrefix}
                        onChange={(e) => setBillForm((p) => ({ ...p, jobCardPrefix: e.target.value }))}
                        placeholder="e.g. K"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Job Card No.</label>
                      <input
                        className="form-input"
                        value={billForm.jobCardNo}
                        onChange={(e) => setBillForm((p) => ({ ...p, jobCardNo: e.target.value }))}
                        placeholder="Job Card No."
                      />
                    </div>
                    <div className="form-field full-width">
                      <label className="form-label">Remarks / Special Notes</label>
                      <input
                        className="form-input"
                        value={billForm.remarks}
                        onChange={(e) => setBillForm((p) => ({ ...p, remarks: e.target.value }))}
                        placeholder="Any additional notes for admin vendor report"
                      />
                    </div>
                  </div>

                  <div className="btn-group">
                    <button type="submit" className={`btn ${isBillSubmitted ? 'btn-success' : 'btn-primary'}`} disabled={submittingBill}>
                      {submittingBill ? 'Submitting...' : isBillSubmitted ? '✓ Update Submitted Vendor Bill Details' : '🧾 Submit Vendor Bill Details to Admin'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Submitted photos preview */}
            {selectedJob.sitePhotos?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3>Uploaded Photos ({selectedJob.sitePhotos.length})</h3>
                </div>
                <div className="card-body">
                  <div className="photo-preview-grid">
                    {selectedJob.sitePhotos.slice(0, 8).map((photo, idx) => (
                      <div key={idx} className="photo-preview-card">
                        <img src={`http://localhost:3000${photo.url}`} alt={photo.caption || `Photo ${idx + 1}`} />
                        <div className="photo-preview-label">{photo.caption || photo.category || `Photo ${idx + 1}`}</div>
                      </div>
                    ))}
                    {selectedJob.sitePhotos.length > 8 && (
                      <div className="photo-preview-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-100)', color: 'var(--gray-600)', fontWeight: 700, fontSize: '1rem' }}>
                        +{selectedJob.sitePhotos.length - 8} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default FieldDashboard
