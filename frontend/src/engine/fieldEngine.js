/**
 * Field Engine — evaluates conditional visibility, computes calculated fields,
 * and validates required fields against a bank template configuration.
 */

// ─── Conditional visibility ───────────────────────────────────────────────────
export function isFieldVisible(field, formData) {
  if (!field.showIf) return true
  const { field: key, value, notIn, in: inArr } = field.showIf
  const current = formData[key]

  if (notIn !== undefined) {
    return !notIn.includes(current)
  }
  if (inArr !== undefined) {
    return inArr.includes(current)
  }
  if (value !== undefined) {
    // Handle boolean string comparison
    if (typeof value === 'boolean') {
      if (typeof current === 'string') return current === String(value)
      return current === value
    }
    return current === value
  }
  return true
}

export function isSectionVisible(section, formData) {
  if (!section.showIf) return true
  return isFieldVisible({ showIf: section.showIf }, formData)
}

// ─── Auto-copy address ────────────────────────────────────────────────────────
export function applySiteAddressCopy(formData) {
  if (formData.siteAddrSameAsDoc === true || formData.siteAddrSameAsDoc === 'true') {
    return {
      ...formData,
      siteAddrDoorNo: formData.docAddrDoorNo || '',
      siteAddrSurveyNo: formData.docAddrSurveyNo || '',
      siteAddrStreet: formData.docAddrStreet || '',
      siteAddrVillage: formData.docAddrVillage || '',
      siteAddrTaluk: formData.docAddrTaluk || '',
      siteAddrDistrict: formData.docAddrDistrict || '',
      siteAddrState: formData.docAddrState || '',
      siteAddrPincode: formData.docAddrPincode || '',
      siteAddress: formData.documentAddress || '',
    }
  }
  return formData
}

// ─── Calculated fields ────────────────────────────────────────────────────────
const safe = (v) => {
  const n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export function computeCalculatedFields(formData, dynamicTables = {}) {
  const d = { ...formData }

  // Land value
  d.landValue = safe(d.landArea) * safe(d.landRate)
  d.udsValue = safe(d.udsAreaVal) * safe(d.udsRate)

  // Depreciation
  const gross = safe(d.grossConstructionValue)
  const depPct = safe(d.depreciationPercent)
  d.depreciationAmount = gross * depPct / 100
  d.netConstructionValue = gross - d.depreciationAmount

  // Amenities from dynamic table
  const amenitiesRows = dynamicTables.amenitiesTable || []
  d.amenitiesValueTotal = amenitiesRows.reduce((sum, row) => {
    return sum + safe(row.quantity) * safe(row.rate)
  }, 0)

  // Total property value
  d.totalPropertyValue = d.landValue + d.udsValue + d.netConstructionValue + d.amenitiesValueTotal + safe(d.otherValue)
  d.presentMarketValue = d.totalPropertyValue
  d.realizableValue = d.totalPropertyValue * 0.9
  d.forcedSaleValue = d.totalPropertyValue * 0.75

  // Value in words
  if (d.totalPropertyValue > 0) {
    d.valueInWords = numberToWords(Math.round(d.totalPropertyValue)) + ' Rupees Only'
  }

  // Floor area totals
  const floorRows = dynamicTables.floorDetails || []
  d.totalCarpetArea = floorRows.reduce((s, r) => s + safe(r.carpetArea), 0)
  d.totalBuiltUpArea = floorRows.reduce((s, r) => s + safe(r.builtUpArea), 0)
  d.totalSuperBuiltUpArea = floorRows.reduce((s, r) => s + safe(r.superBuiltUpArea), 0)

  // Amenity row amounts
  const updatedAmenities = amenitiesRows.map((row) => ({
    ...row,
    amount: safe(row.quantity) * safe(row.rate),
  }))

  return { computed: d, updatedTables: { ...dynamicTables, amenitiesTable: updatedAmenities } }
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function validateForm(template, formData, dynamicTables, photos, documents) {
  const errors = []

  for (const section of template.sections) {
    if (!isSectionVisible(section, formData)) continue

    if (section.fields) {
      for (const field of section.fields) {
        if (!field.required) continue
        if (!isFieldVisible(field, formData)) continue
        const val = formData[field.key]
        if (val === undefined || val === null || String(val).trim() === '') {
          errors.push({ section: section.title, field: field.key, label: field.label })
        }
      }
    }
  }

  // Mandatory photos
  const mandatoryCategories = template.photoCategories?.filter((c) => c.mandatory) || []
  for (const cat of mandatoryCategories) {
    const hasCat = (photos || []).some((p) => p.category === cat.key)
    if (!hasCat) {
      errors.push({ section: 'Photos', field: cat.key, label: `${cat.label} photo (mandatory)` })
    }
  }

  return errors
}

// ─── Form Data Initializer ────────────────────────────────────────────────────
export function initFormData(template) {
  const data = {}
  for (const section of template.sections) {
    if (section.fields) {
      for (const field of section.fields) {
        if (field.type === 'boolean') data[field.key] = false
        else if (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') data[field.key] = ''
        else data[field.key] = ''
      }
    }
  }
  data.reportDate = new Date().toISOString().split('T')[0]
  data.dateOfInspection = new Date().toISOString().split('T')[0]
  return data
}

export function initDynamicTables(template) {
  const tables = {}
  for (const section of template.sections) {
    if (section.type === 'dynamic-table') {
      tables[section.id] = [createTableRow(section.columns)]
    }
  }
  return tables
}

export function createTableRow(columns) {
  const row = {}
  for (const col of columns) {
    if (col.type === 'number' || col.type === 'currency') row[col.key] = ''
    else row[col.key] = ''
  }
  return row
}

// ─── Number to words ──────────────────────────────────────────────────────────
function numberToWords(n) {
  if (n === 0) return 'Zero'
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

  function words(num) {
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + words(num % 100) : '')
    if (num < 100000) return words(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + words(num % 1000) : '')
    if (num < 10000000) return words(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + words(num % 100000) : '')
    return words(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + words(num % 10000000) : '')
  }

  return words(n)
}

// ─── Format currency ─────────────────────────────────────────────────────────
export function formatCurrency(value) {
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function formatNumber(value, decimals = 2) {
  const n = parseFloat(value)
  if (isNaN(n) || n === 0) return ''
  return n.toFixed(decimals)
}
