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
    const existing = job?.visitDetails || {}
    return {
      ...init,
      ...existing,
      applicantName: existing.applicantName || job?.customer || '',
      branchName: existing.branchName || job?.branch || '',
      siteAddress: existing.siteAddress || job?.location || '',
      valuerName: existing.valuerName || 'Er. V. Ramesh Babu B.E.,(Civil)',
    }
  })

  const [dynamicTables, setDynamicTables] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).dynamicTables } catch {}
    }
    if (job?.visitDetails?.dynamicTables) return job.visitDetails.dynamicTables
    return initDynamicTables(template)
  })

  const [photos, setPhotos] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).photos } catch {}
    }
    if (job?.visitDetails?.photos && job.visitDetails.photos.length > 0) return job.visitDetails.photos
    if (job?.visitDetails?.sitePhotos && job.visitDetails.sitePhotos.length > 0) return job.visitDetails.sitePhotos
    return job?.sitePhotos || []
  })

  const [documents, setDocuments] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY(job?.id))
    if (draft) {
      try { return JSON.parse(draft).documents } catch {}
    }
    if (job?.visitDetails?.documents && job.visitDetails.documents.length > 0) return job.visitDetails.documents
    return job?.documents || []
  })

  const [gps, setGps] = useState(() => {
    const existing = job?.visitDetails || {}
    return {
      latitude: existing.latitude || job?.latitude || '',
      longitude: existing.longitude || job?.longitude || '',
      accuracy: existing.accuracy || '',
      gpsTimestamp: existing.gpsTimestamp || '',
    }
  })

  const [declaration, setDeclaration] = useState(true)
  const [validationErrors, setValidationErrors] = useState([])
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('')

  useEffect(() => {
    if (!job) return
    const existing = job.visitDetails || {}
    const init = initFormData(template)
    setFormData((prev) => ({
      ...init,
      ...existing,
      ...prev,
      applicantName: existing.applicantName || job.customer || prev.applicantName || '',
      branchName: existing.branchName || job.branch || prev.branchName || '',
      siteAddress: existing.siteAddress || job.location || prev.siteAddress || '',
      valuerName: existing.valuerName || 'Er. V. Ramesh Babu B.E.,(Civil)',
    }))
    if (existing.dynamicTables) setDynamicTables(existing.dynamicTables)
    if (existing.photos || existing.sitePhotos || job.sitePhotos) {
      setPhotos(existing.photos || existing.sitePhotos || job.sitePhotos || [])
    }
    if (existing.documents || job.documents) {
      setDocuments(existing.documents || job.documents || [])
    }
    if (existing.latitude || existing.longitude) {
      setGps({
        latitude: existing.latitude || '',
        longitude: existing.longitude || '',
        accuracy: existing.accuracy || '',
        gpsTimestamp: existing.gpsTimestamp || '',
      })
    }
  }, [job?.id])

  // Compute calculated fields
  const { computed, updatedTables } = useMemo(
    () => computeCalculatedFields(formData, dynamicTables),
    [formData, dynamicTables]
  )

  useEffect(() => {
    setDynamicTables((prev) => ({ ...prev, ...updatedTables }))
  }, [JSON.stringify(updatedTables)])


  // Auto-save draft on every state change (localStorage keeps data safe)
  useEffect(() => {
    const draft = { formData, dynamicTables, photos, documents, gps, savedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY(job?.id), JSON.stringify(draft))
  }, [formData, dynamicTables, photos, documents, gps])

  // Expose save function to parent via onSaveDraft(draft, saveFn) on mount
  useEffect(() => {
    if (onSaveDraft) {
      // Pass the explicit save fn so parent (Back button) can call it imperatively
      onSaveDraft(null, () => {
        const draft = { formData, dynamicTables, photos, documents, gps, savedAt: Date.now() }
        localStorage.setItem(DRAFT_KEY(job?.id), JSON.stringify(draft))
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (onSaveDraft) onSaveDraft(draft, null)
    setMessage({ text: 'Data saved successfully!', type: 'success' })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleFillSampleData = () => {
    const sample = {
      refNo: `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      reportDate: new Date().toISOString().split('T')[0],
      dateOfInspection: new Date().toISOString().split('T')[0],
      caseType: 'Home Loan',
      purposeOfValuation: 'Home Loan',
      valuerName: 'Er. V. Ramesh Babu B.E.,(Civil)',
      valuerContact: '9874563210',
      branchName: job?.branch || 'Hosur',
      contactedPerson: job?.customer || 'Suresh Kumar',
      contactPersonMobile: '9842109842',
      place: job?.branch || 'Hosur Town',
      distanceFromCity: '3.5 km',
      nearestLandmark: 'Opposite Govt Higher Secondary School',

      applicantName: job?.customer || 'K. Madhusudhanan',
      coApplicantName: 'M. Priyadarshini',
      customerId: 'CUST-884920',
      clientId: 'CL-9921',
      applicantContact: '9845123456',
      ownerName: job?.customer || 'K. Madhusudhanan',
      propertyOwnerName: job?.customer || 'K. Madhusudhanan',
      ownerContact: '9845123456',
      relationshipWithApplicant: 'Self',
      vipCategory: false,
      customerCategory: 'Normal',

      propertyType: 'Residential',
      propertySubType: 'Independent House (G+1)',
      currentUsage: 'Residential Occupied',
      permittedUsage: 'Residential',
      approvedUsage: 'Residential',
      surveyNumber: 'S.No. 452/3B',
      oldSurveyNumber: 'S.No. 452/3',
      newSurveyNumber: 'S.No. 452/3B1',
      plotNumber: 'Plot No. 24',
      doorNumber: 'D.No. 12/4',
      propertyNumber: 'House No. 12/4-A',
      village: 'Avalapalli',
      panchayat: 'Avalapalli Panchayat',
      union: 'Hosur Union',
      taluk: 'Hosur',
      district: 'Krishnagiri',
      state: 'Tamil Nadu',
      pincode: '635109',
      jurisdiction: 'Hosur City Municipal Corporation',
      zonalClassification: 'Residential Zone',
      identificationMethod: 'Boundaries verified with sale deed',
      propertyIdentified: true,
      propertyDemarcated: true,

      docAddrDoorNo: 'Plot No. 24, D.No. 12/4',
      docAddrSurveyNo: 'S.No. 452/3B',
      docAddrStreet: 'Sri Kamatchi Nagar 2nd Cross',
      docAddrVillage: 'Avalapalli Village',
      docAddrTaluk: 'Hosur Taluk',
      docAddrDistrict: 'Krishnagiri District',
      docAddrState: 'Tamil Nadu',
      docAddrPincode: '635109',
      documentAddress: 'Plot No. 24, D.No. 12/4, Sri Kamatchi Nagar 2nd Cross, Avalapalli, Hosur Taluk, Krishnagiri - 635109',

      siteAddrSameAsDoc: true,
      siteAddrDoorNo: 'Plot No. 24, D.No. 12/4',
      siteAddrSurveyNo: 'S.No. 452/3B',
      siteAddrStreet: 'Sri Kamatchi Nagar 2nd Cross',
      siteAddrVillage: 'Avalapalli Village',
      siteAddrTaluk: 'Hosur Taluk',
      siteAddrDistrict: 'Krishnagiri District',
      siteAddrState: 'Tamil Nadu',
      siteAddrPincode: '635109',
      siteAddress: 'Plot No. 24, D.No. 12/4, Sri Kamatchi Nagar 2nd Cross, Avalapalli, Hosur Taluk, Krishnagiri - 635109',

      roadName: 'Sri Kamatchi Nagar Main Road',
      accessRoadType: 'Panchayat Road',
      approachRoadCondition: 'Good',
      approachRoadWidth: '30 Feet BT Road',
      roadWidth: '30 Feet Tar Road',
      accessDetails: 'Direct access from 30ft wide tar road connecting Rayakottai Road',
      distanceFromBranch: '4.2',
      railwayStation: 'Hosur Railway Station',
      railwayStationDistance: '5.0 km',
      busStop: 'Avalapalli Bus Stop',
      busStopDistance: '0.8 km',
      nearbyAmenities: 'Schools, Hospitals, Supermarkets, ATMs within 1.5 km radius',
      publicTransport: 'Available',
      surroundingLocality: 'Fully developed residential colony with independent villas',

      classOfLocality: 'Middle Class',
      siteDevelopment: 'Developed',
      marketability: 'Good',
      surroundingHabitation: '85',
      surroundingDevelopment: '85% developed with residential dwellings',
      localityDescription: 'Peaceful residential locality with good asphalt roads and groundwater',
      proximityToAmenities: 'Schools (500m), Hospital (1.2km), Market (800m)',

      plotShape: 'Rectangular',
      siteAreaDoc: '1800 Sq.Ft',
      siteAreaPatta: '1800 Sq.Ft',
      siteAreaPlan: '1800 Sq.Ft',
      siteAreaActual: '1800',
      plotArea: '1800',
      landArea: '1800',
      udsArea: '1800',
      areaUnit: 'Sq.Ft',
      areaForValuation: '1800',
      lengthDimension: '60 Feet',
      widthDimension: '30 Feet',
      northDimension: '30 Feet',
      southDimension: '30 Feet',
      eastDimension: '60 Feet',
      westDimension: '60 Feet',

      northBoundaryDoc: '30 Feet Wide Road',
      northBoundarySite: '30 Feet Wide Tar Road',
      southBoundaryDoc: 'Plot No. 25',
      southBoundarySite: 'House of Mr. R. Venkatesh',
      eastBoundaryDoc: 'Plot No. 11',
      eastBoundarySite: 'Vacant Plot No. 11',
      westBoundaryDoc: 'Plot No. 23',
      westBoundarySite: 'House of Mrs. Lakshmi',
      boundariesMatching: true,
      boundaryDifferenceRemarks: 'Boundaries matching as per sale deed & physical verification at site.',

      presentOccupancy: 'Self Occupied',
      occupantName: job?.customer || 'K. Madhusudhanan',
      occupantRelationship: 'Self',
      occupancyCurrentUsage: 'Residential Living',
      usageVerified: true,

      typeOfStructure: 'RCC',
      typeOfConstruction: 'Framed',
      foundation: 'Isolated Footing',
      superStructure: 'Brick Masonry with Cement Mortar',
      roof: 'RCC Slab',
      flooring: 'Vitrified',
      doorsWindows: 'Teak Wood Main Door, UPVC Windows',
      electricalFittings: 'Good',
      sanitaryFittings: 'Good',
      compoundWall: 'Available',
      liftAvailable: false,
      numberOfBlocks: '1',
      numberOfWings: '1',
      numberOfUnits: '1',
      numberOfFloorsApproved: '2',
      numberOfFloorsAsBuilt: '2',
      floorNumberOfSubject: 'Ground + 1st Floor',
      numberOfRooms: '6',
      constructionQuality: 'Good',
      constructionStage: 'Completed',
      yearOfConstruction: '2021',
      ageOfProperty: '3',
      residualLife: '57',
      internalComposition: 'GF: Hall, 2 Bedrooms, Kitchen, Dining, 2 Toilets. FF: Hall, 2 Bedrooms, Balcony, 2 Toilets.',

      buildingApprovalAvailable: true,
      buildingApprovalNumber: 'BA/HMC/2021/0481',
      buildingApprovalDate: '2021-03-15',
      planningApproval: true,
      planningApprovalNumber: 'PA/HNTDA/2021/112',
      dtcpApproval: 'Yes',
      hntdaApproval: 'Yes',
      rera: 'N/A',
      layoutApproval: 'Yes',
      sanctionPlanAvailable: true,
      sanctionPlanVerified: true,
      constructionAsPerPlan: true,
      deviationFromPlan: false,
      ownershipType: 'Free Hold',
      documentsVerified: true,
      fsrPermitted: '1.5',
      fsrActual: '1.25',
      permissibleBUA: '2700 Sq.Ft',
      actualBUA: '2250 Sq.Ft',

      electricityAvailable: 'Available',
      ebConnection: 'Available',
      ebServiceConnectionNo: '04-128-009-412',
      waterFacility: 'Available',
      undergroundDrainage: 'Available',
      septicTank: 'Available',
      sump: 'Available',
      overheadTank: 'Available',
      borewell: 'Available',
      roadFacility: 'Available',
      powerBackup: 'Available',

      presentMarketRate: '2800',
      averageMarketRate: '2750',
      maxMarketRate: '3000',
      minMarketRate: '2500',
      guidelineValue: '1800',
      rateUnit: 'Per Sq.Ft',
      propertyClassification: 'Class A Residential',

      landAreaUnit: 'Sq.Ft',
      landRate: '2800',
      landValue: 5040000,
      udsAreaVal: '1800',
      udsRate: '2800',
      udsValue: 5040000,
      grossConstructionValue: 3600000,
      depreciationPercent: '5',
      depreciationAmount: 180000,
      netConstructionValue: 3420000,
      amenitiesValue: 200000,
      otherValue: 100000,
      totalPropertyValue: 8760000,
      presentMarketValue: 8760000,
      realizableValue: 7884000,
      forcedSaleValue: 6570000,
      recommendedValue: 8500000,
      valueInWords: 'Eighty Five Lakh Rupees Only',

      negativeAreaFlag: false,
      inOGL: false,
      riskOfDemolition: 'Nil',
      legalConcern: false,
      documentConcern: false,
      boundaryConcern: false,
      approvalConcern: false,

      observation: 'The property is a clear title residential building located in a well-developed locality of Hosur. Boundaries at site match with title documents. Construction quality is good with RCC framed structure.',
      remarks: 'Recommended for home loan / mortgage. Property is marketable with good resale value.',
    }

    const sampleTables = {
      floorDetails: [
        { floor: 'Ground Floor', carpetArea: '950', builtUpArea: '1150', grossBuiltUpArea: '1150', superBuiltUpArea: '1250', constructionStatus: 'Completed', usage: 'Residential' },
        { floor: 'First Floor', carpetArea: '900', builtUpArea: '1100', grossBuiltUpArea: '1100', superBuiltUpArea: '1200', constructionStatus: 'Completed', usage: 'Residential' },
      ],
    }

    setFormData((prev) => ({ ...prev, ...sample }))
    setDynamicTables((prev) => ({ ...prev, ...sampleTables }))
    setGps({ latitude: '12.7409', longitude: '77.8253', accuracy: '4.2m', gpsTimestamp: new Date().toLocaleString() })
    setValidationErrors([])
    setMessage({ text: '⚡ Sample data filled into all form fields! You can now click "Download Report (Excel)" or "Save & Submit Case".', type: 'success' })
    setTimeout(() => setMessage(null), 6000)
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
          ...formData,
          ...computed,
          photos,
          sitePhotos: photos,
          documents,
          dynamicTables,
          gps,
          latitude: gps?.latitude || computed?.latitude || formData?.latitude || '',
          longitude: gps?.longitude || computed?.longitude || formData?.longitude || '',
          accuracy: gps?.accuracy || '',
          bankCode: job?.bankCode || bankCode || 'UJJ',
          bank: job?.bank || template?.bankName || 'Ujjivan Small Finance Bank',
          customer: job?.customer || computed?.applicantName || '',
          branch: job?.branch || computed?.branchName || '',
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
          <button type="button" className="btn btn-purple" onClick={handleFillSampleData} title="Auto-fill form fields with sample fake data to test export">
            ⚡ Fill Sample Data
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
            💾 Save Draft
          </button>
          {onGenerateReport && (
            <button type="button" className="btn btn-success" onClick={handleDownloadReport}>
              📄 Download Technical Report (Excel)
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

      {/* ─── Scrollable Form Body ─── */}
      <div className="open-form-body">

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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Declaration &amp; Valuer Sign-off</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="declaration-text">
              <p style={{ lineHeight: 1.8, color: 'var(--gray-700)', fontSize: '0.88rem' }}>
                {template.declarationText}
              </p>
            </div>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
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

        {/* bottom padding so last card isn't hidden behind bottom bar */}
        <div style={{ height: 20 }} />
      </form>
      </div>{/* end open-form-body */}

      {/* ─── Bottom Save Action Bar (outside form body, always visible) ─── */}
      <div className="open-form-bottombar">
        <button type="button" className="btn btn-purple" onClick={handleFillSampleData}>
          ⚡ Fill Sample Data
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
          💾 Save Draft
        </button>
        {onGenerateReport && (
          <button type="button" className="btn btn-success btn-lg" onClick={handleDownloadReport}>
            📄 Generate &amp; Download Technical Report (Excel)
          </button>
        )}
        <button type="button" className="btn btn-primary btn-lg" disabled={submitting} onClick={handleFormSubmit}>
          {submitting ? 'Saving Case Details...' : '✅ Save & Submit Property Case'}
        </button>
      </div>
    </div>
  )
}

export default PropertyCaseForm
