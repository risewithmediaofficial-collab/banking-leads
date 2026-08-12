// report_generator.js - ES Module
import XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function totalToWords(num) {
  if (!num || isNaN(num)) return 'Zero'
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  function inWords(n) {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '')
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '')
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '')
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '')
  }
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  let result = 'Rupees ' + inWords(rupees)
  if (paise) result += ' and ' + inWords(paise) + ' Paise'
  return result + ' Only/-'
}

function safeFilePart(name) {
  return String(name || 'report').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 30)
}

function setExcelCell(sheet, addr, val) {
  if (val === undefined || val === null || val === '') return
  try {
    const cell = sheet.getCell(addr)
    cell.value = String(val)
    cell.font = { name: 'Times New Roman', size: 14 }
    cell.alignment = { wrapText: true, vertical: 'middle' }
  } catch (e) { /* skip */ }
}

function getPhotoBuffer(photo) {
  if (!photo) return null
  const urlStr = photo.url || photo.src || photo.path || (typeof photo === 'string' ? photo : '')
  if (!urlStr) return null

  // 1. Base64 Data URL
  if (urlStr.startsWith('data:image/')) {
    try {
      const matches = urlStr.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
      if (matches) {
        const ext = matches[1] === 'png' ? 'png' : 'jpeg'
        const buffer = Buffer.from(matches[2], 'base64')
        return { buffer, extension: ext }
      }
    } catch (e) {
      console.error('Error decoding base64 image:', e.message)
    }
  }

  // 2. Relative or local file path
  try {
    const cleanUrl = urlStr.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '')
    const photoPath = path.join(__dirname, cleanUrl)
    if (fs.existsSync(photoPath)) {
      const ext = photoPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
      const buffer = fs.readFileSync(photoPath)
      return { buffer, extension: ext }
    }
  } catch (e) {
    console.error('Error reading photo file:', e.message)
  }
  return null
}

async function generateTechnicalReport(details, generatedDir, reportTemplatePath) {
  const bankCode = String(details.bankCode || 'UJJ').toUpperCase()
  const isNivara = bankCode === 'NIVARA'

  // ─── Shared field extraction ───
  const refNo = details.refNo || details.nivaraRefNo || details.caseRefNo || `REF-${Date.now().toString().slice(-6)}`
  const reportDate = details.reportDate || new Date().toLocaleDateString('en-GB')
  const inspectionDate = details.dateOfInspection || details.inspectionDate || reportDate
  const branchName = details.branchName || details.branch || 'Krishnagiri'
  const caseType = details.caseType || details.loanType || (isNivara ? 'LAP' : 'MHIL')
  const valuerName = details.valuerName || 'Er. R. Ramesh Babu'
  const contactedPerson = details.contactedPerson || details.applicantName || details.customer || ''
  const contactPersonMobile = details.contactPersonMobile || ''
  const applicantName = details.applicantName || details.customer || 'Govindaraj Raman'
  const ownerName = details.ownerName || details.propertyOwnerName || 'Mrs. Vachala, S/o. Govindaraj'
  const propType = details.propertyType || 'Mixed'
  const currentUsage = details.currentUsage || 'Mixed'
  const siteAddr = details.siteAddress || details.location || 'Door No. 4/529, Bellati , Samanapalli Post, Shoolagiri Taluk, Krishnagiri District, Pin - 635 117.'
  const docAddr = details.documentAddress || 'Land in Sf. No. 64/1C2A New (Old Sf. No. 64/1CA), Samanapalli Village & Panchayat, Shoolagiri Union & Taluk, Krishnagiri District.'
  const landmark = details.nearestLandmark || details.landmark || 'Near to Shoolagiri - Uddanapalli road'
  const distBranch = details.distanceFromBranch ? `${details.distanceFromBranch} Kms.` : '26.10 Kms. from Hosur bus stand'
  const accessRoad = details.roadWidth || details.accessRoadType || details.approachRoadWidth || "Earth road (15' wide) on North side & Earth way (10' wide) on East side"
  const localityClass = details.classOfLocality || 'Middle Class'
  const siteDev = details.siteDevelopment || 'Developing'
  const habitation = details.surroundingHabitation ? String(details.surroundingHabitation) : '40%'
  const amenities = details.nearbyAmenities || 'Available within 6.00 Kms. Radius'
  const railwayStation = details.railwayStation || ''
  const busStop = details.busStop || ''
  const plotArea = details.plotArea || details.areaForValuation || details.siteAreaActual || '4,360.00'
  const udsAreaNum = Number(details.udsArea || details.plotArea || 4360)
  const landArea = Number(details.landArea || details.plotArea || 4360)
  const floors = details.numberOfFloorsAsBuilt || details.floors || '1'
  const rooms = details.numberOfRooms || details.rooms || ''
  const carpetArea = details.totalCarpetArea || details.carpetArea || ''
  const builtUpArea = details.totalBuiltUpArea || details.builtUpArea || '1,191.56'
  const buaNum = Number(details.totalBuiltUpArea || details.builtUpArea || 1191.56)
  const age = details.ageOfProperty || '2'
  const residual = details.residualLife || '28'
  const docVerified = details.documentsVerified === false ? 'No' : 'Yes'
  const ownershipType = details.ownershipType || 'Single ownership'
  const constrType = details.typeOfConstruction || details.typeOfStructure || 'Load Bearing'
  const constrQuality = details.constructionQuality || 'Average'
  const siteAreaDoc = details.siteAreaDoc || '4,360.00'
  const siteAreaSite = details.siteAreaActual || '4,428.00'
  const nBoundDoc = details.northBoundaryDoc || details.northBoundary || 'Sf. No. 61/2 vaari & Govt. puramboku land'
  const nBoundSite = details.northBoundarySite || "Earth road (15' wide)"
  const sBoundDoc = details.southBoundaryDoc || details.southBoundary || 'Allamma paga land in Sf. No. 64/1C2'
  const sBoundSite = details.southBoundarySite || 'Vacant site'
  const eBoundDoc = details.eastBoundaryDoc || details.eastBoundary || '10 feet wide way in Sf. No. 64/1C2'
  const eBoundSite = details.eastBoundarySite || "Earth road (10' wide)"
  const wBoundDoc = details.westBoundaryDoc || details.westBoundary || 'Sf. No. 64/1C1 Rajamma vagaira land'
  const wBoundSite = details.westBoundarySite || 'Vacant site'
  const boundsMatch = (details.boundariesMatching === true || details.boundariesMatching === 'true') ? 'Yes' : 'Yes'
  const landRateVal = Number(details.landRate) || 350
  const udsRate = Number(details.udsRate || details.landRate || 350)
  const landValue = Number(details.landValue) || 1526000
  const constrRate = Number(details.constructionRate || 1300)
  const grossConstr = Number(details.grossConstructionValue) || 1549028
  const depPct = Number(details.depreciationPercent) || 3
  const depAmt = Number(details.depreciationAmount) || 46470.84
  const netConstr = Number(details.netConstructionValue) || 1502557.16
  const amenitiesVal = Number(details.amenitiesValue) || 107000
  const totalVal = Number(details.totalPropertyValue || details.presentMarketValue || 3028557.16)
  const realizableVal = Number(details.realizableValue) || Math.round(totalVal * 0.9)
  const forcedSaleVal = Number(details.forcedSaleValue) || 2422845.73
  const valWords = details.valueInWords || totalToWords(totalVal)
  const observation = details.observation || details.valuerRemarks || details.technicalRemarks || 'Property identified with document, Patta with FMB sketch, EB details & TNGIS.'
  const remarks = details.remarks || ''
  const lat = details.latitude || details.gps?.latitude || '12.651681'
  const lng = details.longitude || details.gps?.longitude || '77.996114'
  const isNegative = details.negativeAreaFlag ? 'Yes' : 'No'
  const inOGL = details.inOGL ? 'Yes' : 'NA'
  const approvedUsage = details.approvedUsage || details.permittedUsage || 'No approval'
  const customerId = details.customerId || details.clientId || '118 180000001370'
  const surveyNo = details.surveyNumber || '2835'
  const bldgApprovalNo = details.buildingApprovalNumber || 'No building approval'
  const constructionAsPerPlan = details.constructionAsPerPlan ? 'Yes' : 'NA'
  const demolitionRisk = details.riskOfDemolition || 'LOW'
  const zonalClass = details.zonalClassification || 'Dry Maanavari Lands Type - III'
  const guidelineRate = Number(details.guidelineValue) || 500000
  const floorRows = Array.isArray(details.dynamicTables?.floorDetails) ? details.dynamicTables.floorDetails : []
  const allPhotos = Array.isArray(details.photos) ? details.photos : (Array.isArray(details.sitePhotos) ? details.sitePhotos : [])

  // ═══════════════════════════════════════════════════════════════
  // NIVARA: Load real XLS template and fill correct cell addresses
  // ═══════════════════════════════════════════════════════════════
  if (isNivara) {
    const wbX = XLSX.readFile(reportTemplatePath, { cellDates: true })
    const wsX = wbX.Sheets[wbX.SheetNames[0]]
    if (wsX['!merges']) {
      const seen = new Set()
      wsX['!merges'] = wsX['!merges'].filter((m) => {
        const key = `${m.s.r}:${m.s.c}-${m.e.r}:${m.e.c}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }
    const xlsxBuf = XLSX.write(wbX, { type: 'buffer', bookType: 'xlsx' })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(xlsxBuf)
    const sheet = workbook.worksheets[0]

    setExcelCell(sheet, 'E20', refNo)
    setExcelCell(sheet, 'K20', reportDate)
    setExcelCell(sheet, 'E21', branchName)
    setExcelCell(sheet, 'K21', caseType)
    setExcelCell(sheet, 'E22', valuerName)
    setExcelCell(sheet, 'E23', refNo)
    setExcelCell(sheet, 'E24', `${contactedPerson}${contactPersonMobile ? ', Cell: ' + contactPersonMobile : ''}`)
    setExcelCell(sheet, 'E26', applicantName)
    setExcelCell(sheet, 'E27', ownerName)
    setExcelCell(sheet, 'E28', propType)
    setExcelCell(sheet, 'K28', currentUsage)
    setExcelCell(sheet, 'E29', siteAddr)
    setExcelCell(sheet, 'E30', docAddr)
    setExcelCell(sheet, 'L31', 'No')
    setExcelCell(sheet, 'H33', approvedUsage)
    setExcelCell(sheet, 'H34', localityClass)
    setExcelCell(sheet, 'H35', siteDev)
    setExcelCell(sheet, 'H36', habitation)
    setExcelCell(sheet, 'H37', amenities)
    setExcelCell(sheet, 'H38', railwayStation)
    setExcelCell(sheet, 'H39', busStop)
    setExcelCell(sheet, 'E40', landmark)
    setExcelCell(sheet, 'E41', distBranch)
    setExcelCell(sheet, 'E42', accessRoad)
    setExcelCell(sheet, 'H44', details.presentOccupancy || 'Occupied')
    setExcelCell(sheet, 'H45', details.occupantName || applicantName)
    setExcelCell(sheet, 'H46', details.occupantRelationship || details.relationshipWithApplicant || 'Applicant')
    setExcelCell(sheet, 'H47', details.propertyDemarcated ? 'Yes' : 'No')
    setExcelCell(sheet, 'H48', details.identificationMethod || 'Document boundaries, property tax, FMB, EB & TNGIS')
    setExcelCell(sheet, 'H49', constrType)
    setExcelCell(sheet, 'H50', siteAreaSite ? `${siteAreaSite} Sft` : '')
    setExcelCell(sheet, 'H51', details.lengthDimension && details.widthDimension
      ? `${details.lengthDimension} x ${details.widthDimension}` : 'Refer FMB sketch')
    setExcelCell(sheet, 'H52', details.numberOfBlocks || 'NA')
    setExcelCell(sheet, 'H53', details.numberOfUnits ? `${details.numberOfUnits} Unit` : '1 Unit')
    setExcelCell(sheet, 'H54', (floors === '2' || floors === 2) ? 'Two (G+1)' : 'One (GF.)')
    setExcelCell(sheet, 'H55', details.liftAvailable ? 'Yes' : 'No')
    setExcelCell(sheet, 'H56', 'NA')
    setExcelCell(sheet, 'H57', rooms || '1BHK')
    setExcelCell(sheet, 'H58', carpetArea ? `${carpetArea} Sft` : '')
    setExcelCell(sheet, 'H59', builtUpArea ? `${builtUpArea} Sft` : '')
    setExcelCell(sheet, 'H60', 'Low')
    setExcelCell(sheet, 'H61', 'Mild')
    setExcelCell(sheet, 'H62', 'III')
    setExcelCell(sheet, 'H63', 'cyclone-prone belt')
    setExcelCell(sheet, 'H64', 'The cyclone-prone belt')
    setExcelCell(sheet, 'H65', 'very low landslide risk')
    setExcelCell(sheet, 'H66', 'high tide line')
    setExcelCell(sheet, 'H67', 'red soil / Alluvial Soils')
    setExcelCell(sheet, 'H68', 'regular shapes Structure')
    setExcelCell(sheet, 'H69', 'Vertical Loads')
    setExcelCell(sheet, 'H70', 'NA')
    setExcelCell(sheet, 'H71', 'NA')
    setExcelCell(sheet, 'H72', constrQuality)
    setExcelCell(sheet, 'H73', constrQuality)
    setExcelCell(sheet, 'E74', age ? `${age} Years (As reported)` : '')
    setExcelCell(sheet, 'K74', residual ? `${residual} Years` : '')
    setExcelCell(sheet, 'E76', bldgApprovalNo)
    setExcelCell(sheet, 'E77', constructionAsPerPlan)
    setExcelCell(sheet, 'E78', details.buildingApprovalNumber
      ? `${details.buildingApprovalNumber}${details.buildingApprovalDate ? ', Dt. ' + details.buildingApprovalDate : ''}` : 'NA')
    setExcelCell(sheet, 'E79', ownershipType)
    setExcelCell(sheet, 'E80', docVerified === 'Yes'
      ? `i) Registered Sale deed${surveyNo ? ', Doc No. ' + surveyNo : ''}. ii) Patta with FMB sketch. iii) EB details.`
      : 'Not verified')
    setExcelCell(sheet, 'E81', details.jurisdiction ? 'Yes' : 'No')
    setExcelCell(sheet, 'E82', approvedUsage)
    const setbackCols = ['D', 'E', 'G', 'H', 'J']
    ;['85', '86', '87', '88'].forEach((row) => {
      setbackCols.forEach((col) => setExcelCell(sheet, `${col}${row}`, 'NA'))
    })
    setExcelCell(sheet, 'F89', demolitionRisk)
    const gfRow = floorRows[0] || {}
    setExcelCell(sheet, 'H91', (floors === '2' || floors === 2) ? 'GF + FF' : 'One (GF.)')
    setExcelCell(sheet, 'H92', carpetArea ? `${carpetArea} Sft` : (gfRow.carpetArea ? `${gfRow.carpetArea} Sft` : ''))
    setExcelCell(sheet, 'H93', 'NA')
    setExcelCell(sheet, 'H94', builtUpArea ? `${builtUpArea} Sft` : (gfRow.builtUpArea ? `${gfRow.builtUpArea} Sft` : ''))
    setExcelCell(sheet, 'H96', builtUpArea ? `${builtUpArea} Sft` : '')
    setExcelCell(sheet, 'H97', guidelineRate ? `Rs.${guidelineRate.toFixed(2)}/Sft` : 'NA')
    setExcelCell(sheet, 'H100', udsAreaNum || landArea || '')
    setExcelCell(sheet, 'J100', udsRate || landRateVal || '')
    setExcelCell(sheet, 'L100', landValue || '')
    setExcelCell(sheet, 'H102', buaNum || '')
    setExcelCell(sheet, 'J102', constrRate || '')
    setExcelCell(sheet, 'L102', grossConstr || '')
    setExcelCell(sheet, 'L103', totalVal || '')
    setExcelCell(sheet, 'H104', 'Completed')
    setExcelCell(sheet, 'L104', '1')
    setExcelCell(sheet, 'H105', grossConstr || '')
    setExcelCell(sheet, 'F108', amenitiesVal > 0
      ? `EB, Sump, Septic tank & Bore well, Rs. ${amenitiesVal.toLocaleString('en-IN')}` : 'No amenities available')
    setExcelCell(sheet, 'I109', amenitiesVal || 0)
    setExcelCell(sheet, 'I110', totalVal || '')
    setExcelCell(sheet, 'I111', realizableVal || '')
    setExcelCell(sheet, 'H112', valWords)
    setExcelCell(sheet, 'H113', 'Rs. 2,000.00/ -month.')
    setExcelCell(sheet, 'H115', 'Yes')
    setExcelCell(sheet, 'H116', zonalClass || propType)
    setExcelCell(sheet, 'H117', ownerName)
    setExcelCell(sheet, 'H118', siteAreaSite ? `${siteAreaSite} Sft.` : '')
    setExcelCell(sheet, 'D121', nBoundDoc)
    setExcelCell(sheet, 'F121', sBoundDoc)
    setExcelCell(sheet, 'H121', eBoundDoc)
    setExcelCell(sheet, 'K121', wBoundDoc)
    setExcelCell(sheet, 'D123', nBoundSite)
    setExcelCell(sheet, 'F123', sBoundSite)
    setExcelCell(sheet, 'H123', eBoundSite)
    setExcelCell(sheet, 'K123', wBoundSite)
    setExcelCell(sheet, 'D124', boundsMatch)
    const remarksList = [
      `Subject Property identified with the help of contact person, registered document, Patta with FMB sketch, EB details & TNGIS.`,
      `Boundaries at site are matching with the document boundaries.`,
      `We inspected on ${inspectionDate}${contactedPerson ? ' in presence of ' + contactedPerson : ''}.`,
      observation || '',
      remarks || '',
    ].filter(Boolean)
    remarksList.forEach((line, i) => {
      if (i < 10) setExcelCell(sheet, `C${129 + i}`, line)
    })
    setExcelCell(sheet, 'H140', observation || 'NA')
    setExcelCell(sheet, 'H141', isNegative)
    setExcelCell(sheet, 'H142', inOGL)
    setExcelCell(sheet, 'E145', lat)
    setExcelCell(sheet, 'K145', lng)

    if (allPhotos.length > 0) {
      let photoRow = 150
      sheet.getCell(`B${photoRow - 1}`).value = 'PROPERTY SITE VISIT PHOTOS & ELEVATIONS:'
      sheet.getCell(`B${photoRow - 1}`).font = { name: 'Times New Roman', size: 14, bold: true }
      for (let i = 0; i < allPhotos.length; i += 2) {
        const left = allPhotos[i]
        const right = allPhotos[i + 1]
        sheet.getCell(`B${photoRow}`).value = `Photo ${i + 1}: ${left.label || left.caption || left.category || left.name || 'Property View'}`
        sheet.getCell(`B${photoRow}`).font = { name: 'Times New Roman', size: 14, bold: true }
        if (right) {
          sheet.getCell(`H${photoRow}`).value = `Photo ${i + 2}: ${right.label || right.caption || right.category || right.name || 'Property View'}`
          sheet.getCell(`H${photoRow}`).font = { name: 'Times New Roman', size: 14, bold: true }
        }
        photoRow++
        const leftObj = getPhotoBuffer(left)
        if (leftObj) {
          try {
            const imgId = workbook.addImage({ buffer: leftObj.buffer, extension: leftObj.extension })
            sheet.addImage(imgId, { tl: { col: 1, row: photoRow }, ext: { width: 310, height: 220 } })
          } catch (e) { console.error('Photo embed error:', e.message) }
        }
        if (right) {
          const rightObj = getPhotoBuffer(right)
          if (rightObj) {
            try {
              const imgId = workbook.addImage({ buffer: rightObj.buffer, extension: rightObj.extension })
              sheet.addImage(imgId, { tl: { col: 7, row: photoRow }, ext: { width: 310, height: 220 } })
            } catch (e) { console.error('Photo embed error:', e.message) }
          }
        }
        sheet.getRow(photoRow).height = 160
        photoRow += 14
      }
    }

    const fileName = `${safeFilePart(applicantName)}-nivara-report.xlsx`
    const filePath = path.join(generatedDir, fileName)
    await workbook.xlsx.writeFile(filePath)
    return `/generated/${fileName}`
  }

  // ═══════════════════════════════════════════════════════════════
  // UJJIVAN: Re-engineered 8-Column Layout with Times New Roman 14pt Default
  // Cols B to I: B(8), C(42), D(28), E(24), F(30), G(24), H(28), I(28)
  // Total width: 232 chars (~1550px)
  // ═══════════════════════════════════════════════════════════════
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ramjayam Associates'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Technical Report', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  sheet.columns = [
    { width: 3 },   // Col A - Margin
    { width: 8 },   // Col B - Sr. No / Code
    { width: 42 },  // Col C - Question / Label 1
    { width: 28 },  // Col D - Option 1 / Value 1
    { width: 24 },  // Col E - Option 2 / Mid Value
    { width: 30 },  // Col F - Option 3 / Label 2
    { width: 24 },  // Col G - Option 4 / Currency
    { width: 28 },  // Col H - Option 5 / Value 2
    { width: 28 },  // Col I - Option 6 / Unit
  ]

  const thin = { style: 'thin', color: { argb: 'FF000000' } }
  const med = { style: 'medium', color: { argb: 'FF000000' } }
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin }
  const medBorders = { top: med, left: med, bottom: med, right: med }

  const lightBlueFill = 'FFBDD7EE'  // Soft light blue fill from Govindaraj template (#BDD7EE)
  const headerBlueFill = 'FFD9E1F2' // Section header blue fill (#D9E1F2)
  const orangeFill = 'FFFCE4D6'     // Orange highlight for case type (#FCE4D6)

  function sCell(addr, val, opts = {}) {
    const c = sheet.getCell(addr)
    c.value = (val !== undefined && val !== null && val !== '') ? val : ''
    c.font = {
      name: 'Times New Roman',
      size: opts.size || 14, // DEFAULT FONT SIZE 14PT FOR EVERY CELL
      bold: opts.bold || false,
      color: { argb: opts.color || 'FF000000' },
      italic: opts.italic || false,
      underline: opts.underline || false,
    }
    if (opts.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
    if (opts.border !== false) c.border = opts.border === 'med' ? medBorders : allBorders
    c.alignment = {
      horizontal: opts.align || 'left',
      vertical: 'middle',
      wrapText: true,
    }
    return c
  }

  function mCell(startAddr, endAddr, val, opts = {}) {
    try { sheet.mergeCells(`${startAddr}:${endAddr}`) } catch (e) { /* skip */ }
    return sCell(startAddr, val, opts)
  }

  function rh(rowNum, h) { sheet.getRow(rowNum).height = h }

  let r = 1

  // ─── 1. LOGO HEADER BANNER ON TOP (TIMES NEW ROMAN 14PT GRID, 1550PX FULL WIDTH B TO I) ───
  const logoPath = path.join(__dirname, 'assets', 'ujjivan_logo.jpg')
  if (fs.existsSync(logoPath)) {
    try {
      const logoBuf = fs.readFileSync(logoPath)
      const logoId = workbook.addImage({ buffer: logoBuf, extension: 'jpeg' })
      rh(r, 320)
      mCell(`B${r}`, `I${r}`, '', { border: false })
      sheet.addImage(logoId, {
        tl: { col: 1, row: r - 1 }, // Column B (0-indexed col 1)
        br: { col: 9, row: r },     // Column I (0-indexed col 9)
        editAs: 'oneCell',
      })
      r++
    } catch (e) {
      console.error('Logo embed error:', e.message)
    }
  } else {
    rh(r, 44)
    mCell(`B${r}`, `I${r}`, 'RAMJAYAM ASSOCIATES', { bold: true, size: 18, align: 'center', fill: 'FFFFFFFF' })
    r++
    rh(r, 20)
    mCell(`B${r}`, `I${r}`, 'Er. Vr. R. RAMESH BABU, B.E., MSc(REV), F.I.V. — Panel Valuer for Ujjivan Small Finance Bank', { size: 12, align: 'center', italic: true })
    r++
  }

  // ─── 2. TITLE BAR ───
  rh(r, 38)
  mCell(`B${r}`, `E${r}`, 'Technical Report on Immovable Property -', { bold: true, size: 14, align: 'left', border: 'med' })
  mCell(`F${r}`, `I${r}`, 'Ujjivan SMALL FINANCE BANK', { bold: true, size: 15, align: 'right', border: 'med' })
  r++

  // ─── 3. APPLICANT BAR ───
  rh(r, 38)
  mCell(`B${r}`, `E${r}`, 'Name of The Applicant', { bold: true, size: 14, fill: lightBlueFill, border: 'med' })
  mCell(`F${r}`, `I${r}`, applicantName, { bold: true, size: 14, fill: lightBlueFill, border: 'med' })
  r++

  // ─── 4. PURPOSE OF VALUATION ───
  rh(r, 34)
  mCell(`B${r}`, `I${r}`, 'Purpose of Valuation: To Ascertain fair market value of the property as on date', { bold: true, italic: true, size: 14, border: 'all' })
  r++

  // ─── 5. BASIC DETAILS TABLE ───
  rh(r, 36)
  sCell(`B${r}`, '1', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `F${r}`, `Name of Valuer: Er. R. Ramesh Babu`, { bold: true, size: 14 })
  sCell(`G${r}`, 'Date', { bold: true, size: 14, align: 'center' })
  mCell(`H${r}`, `I${r}`, reportDate, { bold: true, size: 14, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '2', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Client Id', { bold: true, size: 14 })
  mCell(`D${r}`, `E${r}`, customerId || '118 180000001370', { bold: true, size: 14 })
  mCell(`F${r}`, `G${r}`, 'Case Type', { bold: true, size: 14, align: 'right' })
  mCell(`H${r}`, `I${r}`, caseType, { bold: true, size: 14, align: 'center', fill: orangeFill })
  r++

  rh(r, 36)
  sCell(`B${r}`, '3', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Name of Contact Person & Contact No.', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, `${contactedPerson}${contactPersonMobile ? ', Cell: ' + contactPersonMobile : ''}`, { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '4', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Date of Inspection', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, inspectionDate, { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '5', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Owner of Property', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, ownerName, { bold: true, size: 14, fill: lightBlueFill })
  r++

  rh(r, 64)
  sCell(`B${r}`, '6', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Provided Documents for valuation', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, `i) Scan copy of registered Sale deed, Doc No. ${surveyNo || '2835'}, dt. ${reportDate} in favour of owner,\nii) Scan copy of Patta with FMB sketch &\niii) Scan copy of online EB details.`, { size: 13.5 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '7', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Plot No. / Door No. / Property No.', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, `Door No. 4/529 (As reported)`, { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '8', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `E${r}`, 'Property Address (Document)', { bold: true, size: 14, fill: headerBlueFill })
  mCell(`F${r}`, `I${r}`, 'Property Address (Actual)', { bold: true, size: 14, fill: headerBlueFill })
  r++

  rh(r, 64)
  sCell(`B${r}`, '', { border: 'all' })
  mCell(`C${r}`, `E${r}`, docAddr, { size: 13.5 })
  mCell(`F${r}`, `I${r}`, siteAddr, { size: 13.5 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '9', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `D${r}`, 'Whether property is demarcated', { bold: true, size: 14 })
  sCell(`E${r}`, 'Yes', { bold: true, size: 14, align: 'center' })
  mCell(`F${r}`, `G${r}`, 'Place', { bold: true, size: 14, align: 'center' })
  mCell(`H${r}`, `I${r}`, branchName, { size: 14, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '10', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Nearest Land Mark', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, landmark, { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '11', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Distance From City Centre', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, distBranch, { size: 14 })
  r++

  rh(r, 42)
  sCell(`B${r}`, '12', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Name of the road for access', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, accessRoad, { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '13', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Type of property', { bold: true, size: 14 })
  sCell(`D${r}`, propType, { size: 14 })
  mCell(`E${r}`, `F${r}`, 'Jurisdiction', { bold: true, size: 14 })
  mCell(`G${r}`, `I${r}`, 'Village Panchayat limit', { bold: true, size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '14', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Shape of the Plot', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, 'Irregular', { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '15', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Zonal Classification', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, zonalClass, { size: 14 })
  r++

  // ─── 6. BASIC LAYOUT AMENITIES ───
  rh(r, 36)
  mCell(`B${r}`, `I${r}`, 'Basic Layout Amenities', { bold: true, size: 15, fill: headerBlueFill, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '1', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Water Facility', { bold: true, size: 14 })
  sCell(`D${r}`, 'Underground Drainage', { bold: true, size: 14 })
  mCell(`E${r}`, `G${r}`, 'Type of road', { bold: true, size: 14 })
  mCell(`H${r}`, `I${r}`, 'Electricity - SC. No.', { bold: true, size: 14 })
  r++

  rh(r, 48)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'Yes', { bold: true, size: 14, underline: true, align: 'center' })
  sCell(`D${r}`, 'Yes', { bold: true, size: 14, underline: true, align: 'center' })
  mCell(`E${r}`, `G${r}`, accessRoad, { bold: true, size: 13, underline: true, align: 'center' })
  sCell(`H${r}`, 'no', { size: 14, align: 'center' })
  sCell(`I${r}`, '08-038006466', { size: 14, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '2', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Class of Locality', { bold: true, size: 14 })
  sCell(`D${r}`, "VIP/VVIP's", { size: 13, align: 'center' })
  sCell(`E${r}`, 'Posh', { size: 13, align: 'center' })
  sCell(`F${r}`, 'Middle Class', { bold: true, size: 14, underline: true, align: 'center' })
  sCell(`G${r}`, 'Low class', { size: 13, align: 'center' })
  sCell(`H${r}`, 'MIG', { size: 13, align: 'center' })
  sCell(`I${r}`, 'NEGATIVE', { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '3', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Marketability of Property', { bold: true, size: 14 })
  sCell(`D${r}`, 'EXCELLENT', { size: 13, align: 'center' })
  sCell(`E${r}`, 'VERY GOOD', { size: 13, align: 'center' })
  sCell(`F${r}`, 'GOOD', { bold: true, size: 14, underline: true, align: 'center' })
  mCell(`G${r}`, `H${r}`, 'POOR', { size: 13, align: 'center' })
  sCell(`I${r}`, 'NORMAL', { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '4', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Surrounding locality', { bold: true, size: 14 })
  sCell(`D${r}`, 'Developed', { bold: true, size: 14, underline: true, align: 'center' })
  sCell(`E${r}`, 'Developing', { size: 13, align: 'center' })
  mCell(`F${r}`, `H${r}`, 'Slow developing', { size: 13, align: 'center' })
  sCell(`I${r}`, 'N A', { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '5', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `E${r}`, 'Surrounding Habitation in 200 M radius', { bold: true, size: 14 })
  mCell(`F${r}`, `I${r}`, habitation || '40%', { size: 14, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '6', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Near by Civic Amenities', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, amenities, { size: 14 })
  r++

  // ─── 7. SCHEDULE OF PROPERTY ───
  rh(r, 36)
  sCell(`B${r}`, '7', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Schedule of Property', { bold: true, size: 14 })
  mCell(`D${r}`, `E${r}`, 'As per Document', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  mCell(`F${r}`, `G${r}`, 'As at Site', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  mCell(`H${r}`, `I${r}`, 'Remarks', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  r++

  const remarksSpanned = `As per Doc. - ${siteAreaDoc} Sft.\nAs per Patta - 0.04.05 Hect.\nAs at Site - ${siteAreaSite} Sft.`
  
  rh(r, 36)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'East', { bold: true, size: 14, align: 'center' })
  mCell(`D${r}`, `E${r}`, eBoundDoc, { size: 13 })
  mCell(`F${r}`, `G${r}`, eBoundSite, { size: 13 })
  mCell(`H${r}`, `I${r + 3}`, remarksSpanned, { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'West', { bold: true, size: 14, align: 'center' })
  mCell(`D${r}`, `E${r}`, wBoundDoc, { size: 13 })
  mCell(`F${r}`, `G${r}`, wBoundSite, { size: 13 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'North', { bold: true, size: 14, align: 'center' })
  mCell(`D${r}`, `E${r}`, nBoundDoc, { size: 13 })
  mCell(`F${r}`, `G${r}`, nBoundSite, { size: 13 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'South', { bold: true, size: 14, align: 'center' })
  mCell(`D${r}`, `E${r}`, sBoundDoc, { size: 13 })
  mCell(`F${r}`, `G${r}`, sBoundSite, { size: 13 })
  r++

  rh(r, 34)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'Site Dimension', { bold: true, size: 14 })
  mCell(`D${r}`, `E${r}`, 'E & W: Not mentioned', { size: 13 })
  mCell(`F${r}`, `G${r}`, "E & W: 62'0\" & 62'0\"", { size: 13 })
  mCell(`H${r}`, `I${r}`, '', { border: 'all' })
  r++

  rh(r, 34)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'Balance', { bold: true, size: 14 })
  mCell(`D${r}`, `E${r}`, 'N & S: Not mentioned', { size: 13 })
  mCell(`F${r}`, `G${r}`, "N & S: 72'0\" & 72'0\"", { size: 13 })
  mCell(`H${r}`, `I${r}`, '', { border: 'all' })
  r++

  // ─── 8. TECHNICAL DETAILS ───
  rh(r, 36)
  mCell(`B${r}`, `I${r}`, 'Technical Details', { bold: true, size: 15, fill: headerBlueFill, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '1', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Type of Construction', { bold: true, size: 14 })
  mCell(`D${r}`, `E${r}`, 'RCC Framed', { size: 13, align: 'center' })
  sCell(`F${r}`, 'Load Bearing', { bold: true, size: 14, underline: true, align: 'center' })
  mCell(`G${r}`, `H${r}`, 'Composite', { size: 13, align: 'center' })
  sCell(`I${r}`, 'Pre Engineered', { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '2', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Quality of Construction', { bold: true, size: 14 })
  sCell(`D${r}`, 'Very Good', { size: 13, align: 'center' })
  sCell(`E${r}`, 'Good', { size: 13, align: 'center' })
  sCell(`F${r}`, 'Average', { bold: true, size: 14, underline: true, align: 'center' })
  mCell(`G${r}`, `H${r}`, 'Poor', { size: 13, align: 'center' })
  sCell(`I${r}`, 'Dilapidated', { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '3', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Electrical Fittings', { bold: true, size: 14 })
  sCell(`D${r}`, 'Standard', { bold: true, size: 14, underline: true, align: 'center' })
  sCell(`E${r}`, 'Superior', { size: 13, align: 'center' })
  sCell(`F${r}`, 'Sanitary Fittings', { bold: true, size: 14 })
  mCell(`G${r}`, `H${r}`, 'Standard', { bold: true, size: 14, underline: true, align: 'center' })
  sCell(`I${r}`, 'Superior', { size: 13, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '4', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Lifts', { bold: true, size: 14 })
  mCell(`D${r}`, `E${r}`, 'No', { size: 14, align: 'center' })
  sCell(`F${r}`, 'Compound Wall', { bold: true, size: 14 })
  mCell(`G${r}`, `I${r}`, 'No', { size: 14, align: 'center' })
  r++

  ;[
    ['5', 'Super Structure', 'Brick work'],
    ['6', 'Roof', 'RCC'],
    ['7', 'Doors & Windows', 'Country'],
    ['8', 'Flooring', 'Cement mortar'],
    ['9', 'Year of Construction', '2024 (As reported)'],
  ].forEach(([no, lbl, val]) => {
    rh(r, 36)
    sCell(`B${r}`, no, { bold: true, size: 14, align: 'center' })
    sCell(`C${r}`, lbl, { bold: true, size: 14 })
    mCell(`D${r}`, `I${r}`, val, { size: 14 })
    r++
  })

  rh(r, 36)
  sCell(`B${r}`, '10', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Age of the building', { bold: true, size: 14 })
  sCell(`D${r}`, age, { bold: true, size: 14, align: 'center' })
  sCell(`E${r}`, 'Years', { size: 14 })
  mCell(`F${r}`, `G${r}`, 'Future Life', { bold: true, size: 14, align: 'right' })
  sCell(`H${r}`, residual, { bold: true, size: 14, align: 'center' })
  sCell(`I${r}`, 'Years', { size: 14 })
  r++

  // ─── 9. STATUTORY DETAILS ───
  rh(r, 36)
  mCell(`B${r}`, `I${r}`, 'Statutory Details', { bold: true, size: 15, fill: headerBlueFill, align: 'center' })
  r++

  ;[
    ['1', 'Site Area as per doc. in sft.', siteAreaDoc],
    ['2', 'Site Area as per Plan in Sft.', bldgApprovalNo],
    ['3', 'Site Area as at site in Sft.', siteAreaSite],
    ['4', 'Statutory Approval Details', bldgApprovalNo],
    ['5', 'Approval Number and Date', 'NA'],
    ['6', 'F.S.I/FAR Permitted', '0.27'],
    ['7', 'Permitted use of the Property', 'No approval'],
    ['8', 'Actual use of the property', 'Mixed'],
    ['9', 'Approved Number of Floors', 'NA'],
    ['10', 'As Built Number of Floors', 'One (GF. Only)'],
  ].forEach(([no, lbl, val]) => {
    rh(r, 36)
    sCell(`B${r}`, no, { bold: true, size: 14, align: 'center' })
    sCell(`C${r}`, lbl, { bold: true, size: 14 })
    mCell(`D${r}`, `I${r}`, val, { size: 14 })
    r++
  })

  rh(r, 52)
  sCell(`B${r}`, '11', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `D${r}`, 'Whether the building adheres to National Building Code (NBC)', { bold: true, size: 13 })
  sCell(`E${r}`, 'Yes', { size: 14, align: 'center' })
  mCell(`F${r}`, `H${r}`, 'Whether adheres to NDMA guidelines (Yes/No)', { bold: true, size: 13 })
  sCell(`I${r}`, 'Yes', { size: 14, align: 'center' })
  r++

  // Floor Wise BUA Table
  rh(r, 36)
  sCell(`B${r}`, '12', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Floors', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  mCell(`D${r}`, `F${r}`, 'Permissible BUA in Sft.', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  mCell(`G${r}`, `I${r}`, 'Actual Gross Built Up Area', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  r++

  rh(r, 36)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'Ground floor', { size: 14 })
  mCell(`D${r}`, `E${r}`, '0.00', { size: 14, align: 'right' })
  sCell(`F${r}`, 'Sft.', { size: 14 })
  mCell(`G${r}`, `H${r}`, builtUpArea, { size: 14, align: 'right' })
  sCell(`I${r}`, 'Sft.', { size: 14 })
  r++

  rh(r, 36)
  sCell(`B${r}`, '', { border: 'all' })
  sCell(`C${r}`, 'Total', { bold: true, size: 14, align: 'center' })
  mCell(`D${r}`, `F${r}`, '0.00', { bold: true, size: 14, align: 'right' })
  mCell(`G${r}`, `I${r}`, builtUpArea, { bold: true, size: 14, align: 'right' })
  r++

  ;[
    ['13', 'Adherence to Sanction Plan/ building bye-laws', 'No'],
    ['14', 'Deviation from sanction Plan/building bye-laws (if any)', 'NA'],
  ].forEach(([no, lbl, val]) => {
    rh(r, 36)
    sCell(`B${r}`, no, { bold: true, size: 14, align: 'center' })
    sCell(`C${r}`, lbl, { bold: true, size: 14 })
    mCell(`D${r}`, `I${r}`, val, { size: 14 })
    r++
  })

  rh(r, 36)
  sCell(`B${r}`, '15', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Risk of Demolition (Valuers views)', { bold: true, size: 14 })
  sCell(`D${r}`, 'NO', { size: 13, align: 'center' })
  sCell(`E${r}`, 'NA', { size: 13, align: 'center' })
  sCell(`F${r}`, 'LOW', { bold: true, size: 14, underline: true, align: 'center' })
  mCell(`G${r}`, `H${r}`, 'HIGH', { size: 13, align: 'center' })
  sCell(`I${r}`, 'MEDIUM', { size: 13, align: 'center' })
  r++

  ;[
    ['16', 'Property is Lease Hold / Free Hold', 'Free Hold'],
    ['17', 'Internal Composition', '1BHK'],
    ['18', 'Present Occupancy (Owner Occupied or Tenanted)', 'Self occupied'],
    ['19', 'Present Guide Line of the Property', 'Rs. 500000/ Acre'],
  ].forEach(([no, lbl, val]) => {
    rh(r, 36)
    sCell(`B${r}`, no, { bold: true, size: 14, align: 'center' })
    sCell(`C${r}`, lbl, { bold: true, size: 14 })
    mCell(`D${r}`, `I${r}`, val, { size: 14 })
    r++
  })

  rh(r, 36)
  sCell(`B${r}`, '20', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Present Market rates in the vicinity and surrounding area', { bold: true, size: 13 })
  mCell(`D${r}`, `E${r}`, 'Land Rate in Rs', { bold: true, size: 13, align: 'center' })
  sCell(`F${r}`, `${landRateVal.toFixed(2)}/Sft.`, { size: 14, align: 'center' })
  sCell(`G${r}`, 'to', { size: 14, align: 'center' })
  mCell(`H${r}`, `I${r}`, '400.00/Sft.', { size: 14, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '21', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Sales / Rate / Valuation Average rate', { bold: true, size: 14 })
  mCell(`D${r}`, `I${r}`, landRateVal.toFixed(2), { bold: true, size: 14, align: 'center' })
  r++

  rh(r, 36)
  sCell(`B${r}`, '22', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Cost of Construction Estimate submitted by Customer.', { bold: true, size: 13 })
  mCell(`D${r}`, `I${r}`, 'Not given', { size: 14 })
  r++

  // ─── 10. VALUE OF PROPERTY AS ON DATE ───
  rh(r, 36)
  mCell(`B${r}`, `F${r}`, 'Value of the property as on date', { bold: true, size: 14, fill: headerBlueFill })
  mCell(`G${r}`, `I${r}`, 'Site Area as per Document is Considered', { bold: true, size: 13, fill: headerBlueFill, align: 'right' })
  r++

  // a. Land Value (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'a', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  sCell(`C${r}`, 'Land Value', { bold: true, size: 14, fill: lightBlueFill })
  sCell(`D${r}`, plotArea, { size: 14, align: 'right', fill: lightBlueFill })
  sCell(`E${r}`, 'Sft.', { size: 14, fill: lightBlueFill })
  sCell(`F${r}`, landRateVal.toFixed(2), { size: 14, align: 'right', fill: lightBlueFill })
  mCell(`G${r}`, `H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, landValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // b. Construction Cost Header
  rh(r, 32)
  sCell(`B${r}`, 'b', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Construction Cost', { bold: true, size: 14 })
  sCell(`D${r}`, 'Area', { bold: true, size: 14, align: 'center' })
  sCell(`E${r}`, 'Unit', { bold: true, size: 14, align: 'center' })
  sCell(`F${r}`, 'Rate / Sft.', { bold: true, size: 14, align: 'center' })
  mCell(`G${r}`, `I${r}`, 'Amount in INR', { bold: true, size: 14, align: 'right' })
  r++

  // c. Ground Floor
  rh(r, 36)
  sCell(`B${r}`, 'c', { bold: true, size: 14, align: 'center' })
  sCell(`C${r}`, 'Ground Floor after completion of building', { size: 14 })
  sCell(`D${r}`, builtUpArea, { size: 14, align: 'right' })
  sCell(`E${r}`, 'Sft.', { size: 14 })
  sCell(`F${r}`, constrRate.toFixed(2), { size: 14, align: 'right' })
  mCell(`G${r}`, `I${r}`, grossConstr.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { size: 14, align: 'right' })
  r++

  // e. Gross Construction Value (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'e', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  mCell(`C${r}`, `G${r}`, 'Gross Construction Value in Rs.', { bold: true, size: 14, fill: lightBlueFill })
  sCell(`H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, grossConstr.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // f. Depreciation
  rh(r, 36)
  sCell(`B${r}`, 'f', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `F${r}`, 'Less for Depreciation for RCC roof building', { size: 14 })
  sCell(`G${r}`, `${depPct.toFixed(2)} %`, { size: 14, align: 'right' })
  sCell(`H${r}`, 'Rs.', { size: 14, align: 'right' })
  sCell(`I${r}`, depAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { size: 14, align: 'right' })
  r++

  // g. Net Construction Value (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'g', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  mCell(`C${r}`, `G${r}`, 'Net Construction Value', { bold: true, size: 14, fill: lightBlueFill })
  sCell(`H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, netConstr.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // h. Amenities
  rh(r, 32)
  sCell(`B${r}`, 'h', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `I${r}`, 'Amenities & services', { bold: true, size: 14 })
  r++

  ;[
    ['EB connection', '12,000.00'],
    ['Sump with pipe line arrangement', '45,000.00'],
    ['Septic tank with pipe line arrangement', '50,000.00'],
  ].forEach(([lbl, amt]) => {
    rh(r, 32)
    sCell(`B${r}`, '', { border: 'all' })
    mCell(`C${r}`, `G${r}`, lbl, { size: 14 })
    sCell(`H${r}`, 'Rs.', { size: 14, align: 'right' })
    sCell(`I${r}`, amt, { size: 14, align: 'right' })
    r++
  })

  // i. Amenities Value
  rh(r, 36)
  sCell(`B${r}`, 'i', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `G${r}`, 'Amenities & services value', { bold: true, size: 14 })
  sCell(`H${r}`, 'Rs.', { size: 14, align: 'right' })
  sCell(`I${r}`, amenitiesVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right' })
  r++

  // j. Total Value of Property (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'j', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  mCell(`C${r}`, `G${r}`, 'Total Value of Property', { bold: true, size: 14, fill: lightBlueFill })
  sCell(`H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // l. Others
  rh(r, 32)
  sCell(`B${r}`, 'l', { bold: true, size: 14, align: 'center' })
  mCell(`C${r}`, `E${r}`, 'Others & Rounding Off in Rs.', { size: 14 })
  sCell(`F${r}`, '0.00', { size: 14, align: 'right' })
  sCell(`G${r}`, '-1', { size: 14, align: 'center' })
  sCell(`H${r}`, 'Rs.', { size: 14, align: 'right' })
  sCell(`I${r}`, '0.00', { size: 14, align: 'right' })
  r++

  // m. Present Value of Property (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'm', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  mCell(`C${r}`, `G${r}`, 'Present Value of Property', { bold: true, size: 14, fill: lightBlueFill })
  sCell(`H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // n. Fair Market Value (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'n', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  mCell(`C${r}`, `G${r}`, 'Fair Market Value of Property', { bold: true, size: 14, fill: lightBlueFill })
  sCell(`H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // o. Forced Sale Value (Light Blue Fill)
  rh(r, 36)
  sCell(`B${r}`, 'o', { bold: true, size: 14, align: 'center', fill: lightBlueFill })
  sCell(`C${r}`, 'Forced Sale Value - At present', { bold: true, size: 14, fill: lightBlueFill })
  mCell(`D${r}`, `F${r}`, forcedSaleVal.toFixed(0), { size: 14, align: 'center', fill: lightBlueFill })
  sCell(`G${r}`, 'Say', { size: 14, align: 'center', fill: lightBlueFill })
  sCell(`H${r}`, 'Rs.', { size: 14, fill: lightBlueFill, align: 'right' })
  sCell(`I${r}`, forcedSaleVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { bold: true, size: 14, align: 'right', fill: lightBlueFill })
  r++

  // ─── 11. REMARKS & DECLARATIONS ───
  rh(r, 36)
  mCell(`B${r}`, `I${r}`, 'Remarks / Comments if any;', { bold: true, size: 14, fill: headerBlueFill })
  r++

  ;[
    ['1', 'Property identified with document, Patta with FMB sketch, EB details & TNGIS.'],
    ['3', `Land extent as per Doc. - ${plotArea} Sft., as per Patta - 0.04.05 Hect. & as at Site - ${siteAreaSite} Sft. So, least land extent is considered for valuation.`],
    ['4', 'Property tax not given by applicant.'],
  ].forEach(([no, txt]) => {
    rh(r, txt.length > 90 ? 56 : 36)
    sCell(`B${r}`, no, { bold: true, size: 14, align: 'center' })
    mCell(`C${r}`, `I${r}`, txt, { size: 14 })
    r++
  })

  // GEO Tag & Stage Table
  rh(r, 36)
  mCell(`B${r}`, `F${r}`, 'Geographical Location/Location GEO TAG:', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  sCell(`G${r}`, 'Present Stage', { bold: true, size: 14, align: 'center', fill: headerBlueFill })
  mCell(`H${r}`, `I${r}`, 'IX PART "I": RECCOMENDATION', { bold: true, size: 13, align: 'center', fill: headerBlueFill })
  r++

  rh(r, 56)
  mCell(`B${r}`, `F${r}`, `Latitude: ${lat}, Longitude: ${lng}`, { bold: true, size: 14, align: 'center' })
  sCell(`G${r}`, 'Occupied', { size: 14, align: 'center' })
  mCell(`H${r}`, `I${r}`, 'Civil 100%, Interior 100%\nStatus: Occupied', { size: 13, align: 'center' })
  r++

  // Declaration
  rh(r, 36)
  mCell(`B${r}`, `I${r}`, 'Declaration : I here by declare that', { bold: true, size: 14, fill: headerBlueFill })
  r++

  ;[
    '1. I have no direct or indirect interest in the property valued; The information furnished in the report is true and correct to the best of my knowledge and belief for the property shown by the client and details furnished / provided by the client at site. The provided fair market value is as on date and varies with time to time.',
    '2. The ownership, all related documents / registered partition deed & boundary certificate please verify with original at your end to ascertain the right title & area, subject to legal clearance and free from all encumbrances only.',
    '3. Please Contact us for any Clarifications Required on this Valuation Report before Conclusion.',
    '4. Legal aspects are not considered in this valuation report.',
  ].forEach((line, i) => {
    rh(r, line.length > 140 ? 64 : 36)
    sCell(`B${r}`, String(i + 1), { bold: true, size: 14, align: 'center' })
    mCell(`C${r}`, `I${r}`, line, { size: 13.5 })
    r++
  })

  rh(r, 36)
  mCell(`B${r}`, `E${r}`, `Date: ${reportDate}`, { bold: true, size: 14 })
  mCell(`F${r}`, `I${r}`, `Place: ${branchName}.`, { bold: true, size: 14 })
  r++

  // ─── 12. PHOTOS OF PROPERTY ───
  if (allPhotos.length > 0) {
    r += 2
    rh(r, 36)
    mCell(`B${r}`, `I${r}`, 'Photos of Property', { bold: true, size: 15, align: 'center', fill: headerBlueFill })
    r++

    // Embed photos 3 per row in a clean grid
    for (let i = 0; i < allPhotos.length; i += 3) {
      const p1 = allPhotos[i]
      const p2 = allPhotos[i + 1]
      const p3 = allPhotos[i + 2]

      rh(r, 210)

      if (p1) {
        const buf1 = getPhotoBuffer(p1)
        if (buf1) {
          try {
            const imgId = workbook.addImage({ buffer: buf1.buffer, extension: buf1.extension })
            sheet.addImage(imgId, { tl: { col: 1, row: r - 1 }, ext: { width: 310, height: 200 } })
          } catch (e) {}
        }
      }
      if (p2) {
        const buf2 = getPhotoBuffer(p2)
        if (buf2) {
          try {
            const imgId = workbook.addImage({ buffer: buf2.buffer, extension: buf2.extension })
            sheet.addImage(imgId, { tl: { col: 4, row: r - 1 }, ext: { width: 310, height: 200 } })
          } catch (e) {}
        }
      }
      if (p3) {
        const buf3 = getPhotoBuffer(p3)
        if (buf3) {
          try {
            const imgId = workbook.addImage({ buffer: buf3.buffer, extension: buf3.extension })
            sheet.addImage(imgId, { tl: { col: 7, row: r - 1 }, ext: { width: 310, height: 200 } })
          } catch (e) {}
        }
      }
      r += 15
    }
  }

  const fileName = `${safeFilePart(applicantName)}-ujjivan-report.xlsx`
  const filePath = path.join(generatedDir, fileName)
  await workbook.xlsx.writeFile(filePath)
  return `/generated/${fileName}`
}

export { generateTechnicalReport, safeFilePart, totalToWords, setExcelCell, getPhotoBuffer }
