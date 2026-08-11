import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

const generatedDir = path.join(__dirname, 'generated')
const assetsDir = path.join(__dirname, 'assets')
fs.mkdirSync(generatedDir, { recursive: true })
fs.mkdirSync(assetsDir, { recursive: true })

// Copy Ujjivan logo to assets directory if needed
const frontendAssestsLogo = path.join(__dirname, '..', 'frontend', 'src', 'assests', 'vendor bill logo excel.jpg')
if (fs.existsSync(frontendAssestsLogo)) {
  const targetPath = path.join(assetsDir, 'ujjivan_logo.jpg')
  if (!fs.existsSync(targetPath)) {
    try { fs.copyFileSync(frontendAssestsLogo, targetPath) } catch (_) {}
  }
}

app.use('/generated', express.static(generatedDir))
app.use('/assets', express.static(assetsDir))

const reportTemplatePath = path.join(__dirname, 'Report Format New. (1).xls')
const billingTemplatePath = path.join(__dirname, 'Revised Jul. bill -26 (1).xlsx')
const mlapBillingTemplatePath = path.join(__dirname, 'June-Bill Mlap.xlsx')
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/banking-leads'

const builtInBankTemplates = {
  UJJ: {
    branchName: 'Suramangalam',
    address: 'No-30/3-2, Mullai Nagar, Salem Main Road, Suramangalam, Salem - 636005',
    gstNo: '',
    contactPerson: '',
    phone: '',
    email: '',
    reportTemplate: 'Report Govindharaj.pdf',
    billingTemplate: 'June-Bill Mlap.xlsx',
    reportFields: [
      'Reference number',
      'Report date',
      'Branch name',
      'Case type',
      'Contacted person',
      'Applicant name',
      'Owner name',
      'Property type',
      'Current usage',
      'Address as at site',
      'Address as per document',
      'Landmark',
      'Distance from branch',
      'Occupancy',
      'Property identified through',
      'Land / plot area / UDS',
      'Floors',
      'Rooms',
      'Carpet area',
      'Built up area',
      'Property age',
      'Documents verified',
      'Total valuation amount',
      'Boundaries',
      'Observation',
      'Latitude',
      'Longitude',
    ],
    billFields: [
      'Branch',
      'Customer ID',
      'Customer name',
      'Date of opinion',
      'Opinion fee',
      'Additional fee',
      'Total amount',
      'Job card prefix',
      'Job card number',
    ],
  },
  NIVARA: {
    branchName: '',
    address: '',
    gstNo: '33AAECN7936M1Z0',
    contactPerson: '',
    phone: '',
    email: '',
    reportTemplate: 'Report Format New. (1).xls',
    billingTemplate: 'Revised Jul. bill -26 (1).xlsx',
    reportFields: [
      'Reference number',
      'Report date',
      'Branch name',
      'Type of case',
      'Valuer name',
      'Case reference number',
      'Contacted person',
      'Applicant name',
      'Owner name',
      'Property type',
      'Current usage',
      'Address as at site',
      'Address as per document',
      'Location and locality',
      'Distance from branch',
      'Occupancy',
      'Building details',
      'Area details',
      'Age of property',
      'Documents verified',
      'Valuation amount',
      'Boundaries',
      'Remarks',
      'Latitude',
      'Longitude',
    ],
    billFields: [
      'Applicant name',
      'Date of initiation',
      'Property location',
      'Distance from branch',
      'Fresh/stage report',
      'Amount',
      'Job card number',
    ],
  },
}

function getBuiltInTemplate(code) {
  return builtInBankTemplates[String(code || '').trim().toUpperCase()] || {}
}

function getBankLogoPath(bankCode) {
  const code = String(bankCode || '').trim().toUpperCase()
  const possiblePaths = [
    ...(code === 'NIVARA' ? [
      path.join(assetsDir, 'nivara_logo.png'),
      path.join(assetsDir, 'nivara_logo.jpg'),
      path.join(assetsDir, 'nivara.png'),
      path.join(assetsDir, 'nivara.jpg'),
      path.join(__dirname, '..', 'frontend', 'src', 'assests', 'nivara_logo.png'),
      path.join(__dirname, '..', 'frontend', 'src', 'assests', 'nivara_logo.jpg'),
      path.join(__dirname, '..', 'frontend', 'src', 'assets', 'nivara_logo.png'),
      path.join(__dirname, '..', 'frontend', 'src', 'assets', 'nivara_logo.jpg'),
    ] : []),
    ...(code === 'UJJ' ? [
      path.join(assetsDir, 'ujjivan_logo.jpg'),
      path.join(assetsDir, 'ujjivan_logo.png'),
      path.join(assetsDir, 'vendor bill logo excel.jpg'),
      path.join(__dirname, '..', 'frontend', 'src', 'assests', 'vendor bill logo excel.jpg'),
    ] : []),
    path.join(assetsDir, `${code.toLowerCase()}_logo.png`),
    path.join(assetsDir, `${code.toLowerCase()}_logo.jpg`),
    path.join(assetsDir, 'vendor bill logo excel.jpg'),
    path.join(__dirname, '..', 'frontend', 'src', 'assests', 'vendor bill logo excel.jpg'),
  ]
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

const schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      delete ret._id
      delete ret.password
      return ret
    },
  },
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['admin', 'field'], default: 'field' },
}, schemaOptions)

const bankTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  active: { type: Boolean, default: true },
  branchName: { type: String, default: '' },
  address: { type: String, default: '' },
  gstNo: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  reportTemplate: { type: String, default: '' },
  billingTemplate: { type: String, default: '' },
  reportFields: { type: [String], default: [] },
  billFields: { type: [String], default: [] },
}, schemaOptions)

const leadSchema = new mongoose.Schema({
  customer: { type: String, required: true, trim: true },
  customerPhone: { type: String, default: '', trim: true },
  bank: { type: String, default: '' },
  bankCode: { type: String, default: '' },
  branch: { type: String, default: '' },
  location: { type: String, default: '' },
  loanType: { type: String, default: '' },
  bankRefNo: { type: String, default: '' },
  receivedDate: { type: String, default: '' },
  priority: { type: String, default: 'Normal' },
  notes: { type: String, default: '' },
  status: { type: String, default: 'NEW' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedEmployee: { type: String, default: '' },
}, schemaOptions)

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `site-photo-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

app.use('/uploads', express.static(uploadsDir))

const jobSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  bank: { type: String, default: '' },
  bankCode: { type: String, default: '' },
  branch: { type: String, default: '' },
  customer: { type: String, required: true },
  location: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedEmployee: { type: String, default: '' },
  status: { type: String, default: 'ASSIGNED' },
  statusNote: { type: String, default: '' },
  verificationRemarks: { type: String, default: '' },
  taskDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  visitDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  vendorBillDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  sitePhotos: { type: [mongoose.Schema.Types.Mixed], default: [] },
  visitedAt: { type: Date },
  completedAt: { type: Date },
}, schemaOptions)

const User = mongoose.model('User', userSchema)
const BankTemplate = mongoose.model('BankTemplate', bankTemplateSchema)
const Lead = mongoose.model('Lead', leadSchema)
const Job = mongoose.model('Job', jobSchema)

function safeFilePart(value) {
  return String(value || 'report').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').slice(0, 60)
}

function setExcelCell(sheet, address, value) {
  if (value === undefined || value === null) return
  sheet.getCell(address).value = value
}

function totalToWords(amount) {
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const convertBelowThousand = (number) => {
    let result = ''
    if (number >= 100) {
      result += `${words[Math.floor(number / 100)]} hundred `
      number %= 100
    }
    if (number >= 20) {
      result += `${tens[Math.floor(number / 10)]} `
      number %= 10
    }
    if (number > 0) result += `${words[number]} `
    return result.trim()
  }
  let number = Math.round(Number(amount) || 0)
  if (!number) return 'Rupees zero only'
  const parts = []
  const crore = Math.floor(number / 10000000)
  if (crore) parts.push(`${convertBelowThousand(crore)} crore`)
  number %= 10000000
  const lakh = Math.floor(number / 100000)
  if (lakh) parts.push(`${convertBelowThousand(lakh)} lakh`)
  number %= 100000
  const thousand = Math.floor(number / 1000)
  if (thousand) parts.push(`${convertBelowThousand(thousand)} thousand`)
  number %= 1000
  if (number) parts.push(convertBelowThousand(number))
  return `Rupees ${parts.join(' ')} only`
}

async function embedBankLogo(workbook, sheet, bankCode) {
  const logoPath = getBankLogoPath(bankCode)
  if (!logoPath) return
  try {
    const ext = logoPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
    const imgId = workbook.addImage({ filename: logoPath, extension: ext })
    const code = String(bankCode || '').trim().toUpperCase()
    if (code === 'UJJ') {
      sheet.addImage(imgId, { tl: { col: 1, row: 1 }, br: { col: 5, row: 11 } })
    } else if (code === 'NIVARA') {
      sheet.addImage(imgId, { tl: { col: 0.5, row: 0.2 }, ext: { width: 190, height: 50 } })
    } else {
      sheet.addImage(imgId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 180, height: 50 } })
    }
  } catch (err) {
    console.error('Error embedding bank logo:', err.message)
  }
}

async function generateTechnicalReport(details) {
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

  const bankCode = String(details.bankCode || 'UJJ').toUpperCase()
  await embedBankLogo(workbook, sheet, bankCode)

  const refNo = details.refNo || details.nivaraRefNo || details.caseRefNo || `REF-${Date.now().toString().slice(-6)}`
  const reportDate = details.reportDate || new Date().toLocaleDateString('en-GB')
  const branchName = details.branchName || details.branch || ''
  const caseType = details.caseType || details.loanType || 'LAP'
  const valuerName = details.valuerName || 'Er. V. Ramesh Babu B.E.,(Civil)'
  const contactedPerson = details.contactedPerson || details.applicantName || details.customer || ''
  const applicantName = details.applicantName || details.customer || ''
  const ownerName = details.ownerName || details.propertyOwnerName || applicantName
  const propType = details.propertyType || 'Residential'
  const currentUsage = details.currentUsage || 'Residential'
  const siteAddr = details.siteAddress || details.location || ''
  const docAddr = details.documentAddress || siteAddr
  const landmark = details.nearestLandmark || details.landmark || ''
  const distBranch = details.distanceFromBranch || ''
  const occupancy = details.presentOccupancy || details.occupancy || 'Self Occupied'
  const occupantName = details.occupantName || applicantName
  const occupantRel = details.occupantRelationship || details.relationshipWithApplicant || 'Self'
  const identMethod = details.identificationMethod || 'Property Documents & Site Inspection'
  const plotArea = details.plotArea || details.areaForValuation || details.siteAreaActual || ''
  const floors = details.numberOfFloorsAsBuilt || details.floors || '1'
  const rooms = details.numberOfRooms || details.rooms || ''
  const carpetArea = details.totalCarpetArea || details.carpetArea || ''
  const builtUpArea = details.totalBuiltUpArea || details.builtUpArea || ''
  const age = details.ageOfProperty || details.propertyAge || ''
  const residual = details.residualLife || ''
  const docsVerified = details.documentsVerified === true || details.documentsVerified === 'true' ? 'Yes' : 'No'
  const totalVal = Number(details.totalPropertyValue || details.presentMarketValue || details.totalValue || 0)
  const valWords = details.valueInWords || totalToWords(totalVal)

  const nBound = details.northBoundarySite || details.northBoundaryDoc || details.northBoundary || ''
  const sBound = details.southBoundarySite || details.southBoundaryDoc || details.southBoundary || ''
  const eBound = details.eastBoundarySite || details.eastBoundaryDoc || details.eastBoundary || ''
  const wBound = details.westBoundarySite || details.westBoundaryDoc || details.westBoundary || ''
  const boundsMatch = (details.boundariesMatching === true || details.boundariesMatching === 'true' || details.boundariesMatching === 'Matching') ? 'Matching' : 'Not Matching'
  const observation = details.valuerRemarks || details.technicalRemarks || details.observation || 'Property inspected and found in good condition.'
  const isNegative = details.negativeAreaFlag ? 'Yes' : 'No'
  const lat = details.latitude || details.gps?.latitude || ''
  const lng = details.longitude || details.gps?.longitude || ''

  setExcelCell(sheet, 'E20', refNo)
  setExcelCell(sheet, 'K20', reportDate)
  setExcelCell(sheet, 'E21', branchName)
  setExcelCell(sheet, 'K21', caseType)
  setExcelCell(sheet, 'E22', valuerName)
  setExcelCell(sheet, 'E23', refNo)
  setExcelCell(sheet, 'E24', contactedPerson)
  setExcelCell(sheet, 'E26', applicantName)
  setExcelCell(sheet, 'E27', ownerName)
  setExcelCell(sheet, 'E28', propType)
  setExcelCell(sheet, 'K28', currentUsage)
  setExcelCell(sheet, 'E29', siteAddr)
  setExcelCell(sheet, 'E30', docAddr)
  setExcelCell(sheet, 'E40', landmark)
  setExcelCell(sheet, 'E41', distBranch)
  setExcelCell(sheet, 'H44', occupancy)
  setExcelCell(sheet, 'H45', occupantName)
  setExcelCell(sheet, 'H46', occupantRel)
  setExcelCell(sheet, 'H48', identMethod)
  setExcelCell(sheet, 'H50', plotArea)
  setExcelCell(sheet, 'H54', floors)
  setExcelCell(sheet, 'H57', rooms)
  setExcelCell(sheet, 'H58', carpetArea)
  setExcelCell(sheet, 'H59', builtUpArea)
  setExcelCell(sheet, 'E74', age)
  setExcelCell(sheet, 'K74', residual)
  setExcelCell(sheet, 'E80', docsVerified)
  setExcelCell(sheet, 'H110', 'Rs.')
  setExcelCell(sheet, 'I110', totalVal || '')
  setExcelCell(sheet, 'H112', valWords)
  setExcelCell(sheet, 'D123', nBound)
  setExcelCell(sheet, 'F123', sBound)
  setExcelCell(sheet, 'H123', eBound)
  setExcelCell(sheet, 'K123', wBound)
  setExcelCell(sheet, 'D124', boundsMatch)
  setExcelCell(sheet, 'H140', observation)
  setExcelCell(sheet, 'H141', isNegative)
  setExcelCell(sheet, 'E145', lat)
  setExcelCell(sheet, 'K145', lng)

  const allPhotos = Array.isArray(details.photos) ? details.photos : (Array.isArray(details.sitePhotos) ? details.sitePhotos : [])
  if (allPhotos.length > 0) {
    let photoRow = 150
    sheet.getCell(`B${photoRow - 1}`).value = 'PROPERTY SITE VISIT PHOTOS & ELEVATIONS:'
    sheet.getCell(`B${photoRow - 1}`).font = { name: 'Arial', size: 11, bold: true }
    allPhotos.forEach((photo, idx) => {
      const relativePath = (photo.url || '').replace(/^\//, '')
      const photoPath = path.join(__dirname, relativePath)
      if (fs.existsSync(photoPath)) {
        try {
          const ext = photoPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
          const imgId = workbook.addImage({ filename: photoPath, extension: ext })
          sheet.getCell(`B${photoRow}`).value = `Photo ${idx + 1}: ${photo.caption || photo.category || photo.name || 'Property View'}`
          sheet.addImage(imgId, {
            tl: { col: 1, row: photoRow },
            ext: { width: 320, height: 220 },
          })
          photoRow += 14
        } catch (err) {
          console.error('Error embedding site photo:', err.message)
        }
      }
    })
  }

  const fileName = `${safeFilePart(applicantName)}-technical-report.xlsx`
  const filePath = path.join(generatedDir, fileName)
  await workbook.xlsx.writeFile(filePath)
  return `/generated/${fileName}`
}

app.post('/api/upload', upload.array('photos', 10), (req, res) => {
  const files = (req.files || []).map((file) => ({
    url: `/uploads/${file.filename}`,
    name: file.originalname,
    filename: file.filename,
    uploadedAt: new Date(),
  }))
  res.json({ success: true, files })
})

app.get('/api/billing/summary', asyncRoute(async (req, res) => {
  const { period = 'all' } = req.query
  let dateQuery = {}
  const now = new Date()

  if (period === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    dateQuery = { createdAt: { $gte: weekAgo } }
  } else if (period === 'monthly') {
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    dateQuery = { createdAt: { $gte: monthAgo } }
  }

  const jobs = await Job.find(dateQuery).lean()
  const users = await User.find({ role: 'field' }).lean()

  const byEmployeeMap = {}
  users.forEach((emp) => {
    byEmployeeMap[emp._id.toString()] = {
      employeeId: emp._id.toString(),
      employeeName: emp.name,
      totalCases: 0,
      totalBilling: 0,
      cases: [],
    }
  })

  const byBankMap = {}

  jobs.forEach((job) => {
    const empId = job.assignedTo ? job.assignedTo.toString() : 'unassigned'
    const fee = Number(job.visitDetails?.totalValue) || Number(job.visitDetails?.amount) || 1500

    if (!byEmployeeMap[empId]) {
      byEmployeeMap[empId] = {
        employeeId: empId,
        employeeName: job.assignedEmployee || 'Unassigned Executive',
        totalCases: 0,
        totalBilling: 0,
        cases: [],
      }
    }
    byEmployeeMap[empId].totalCases += 1
    byEmployeeMap[empId].totalBilling += fee
    byEmployeeMap[empId].cases.push({
      caseId: job._id,
      customer: job.customer,
      bank: job.bank || job.bankCode,
      branch: job.branch,
      status: job.status,
      fee,
    })

    const bankKey = `${job.bankCode || 'GENERAL'}-${job.branch || 'MAIN'}`
    if (!byBankMap[bankKey]) {
      byBankMap[bankKey] = {
        bankCode: job.bankCode || 'GENERAL',
        bankName: job.bank || 'Bank',
        branch: job.branch || 'Main Branch',
        totalCases: 0,
        totalBilling: 0,
        cases: [],
      }
    }
    byBankMap[bankKey].totalCases += 1
    byBankMap[bankKey].totalBilling += fee
    byBankMap[bankKey].cases.push({
      caseId: job._id,
      customer: job.customer,
      assignedEmployee: job.assignedEmployee,
      fee,
    })
  })

  const grandTotal = Object.values(byEmployeeMap).reduce((sum, item) => sum + item.totalBilling, 0)

  res.json({
    period,
    grandTotal,
    byEmployee: Object.values(byEmployeeMap),
    byBank: Object.values(byBankMap),
  })
}))

async function generateVendorBill(payload) {
  const templatePath = payload.bankCode === 'UJJ' ? mlapBillingTemplatePath : billingTemplatePath
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(templatePath)
  const sheet = workbook.getWorksheet(1)
  const rows = Array.isArray(payload.cases) ? payload.cases : []

  if (payload.bankCode === 'UJJ') {
    if (payload.invoiceDate) setExcelCell(sheet, 'I15', `Date: ${payload.invoiceDate}`)
    if (payload.invoiceNo) setExcelCell(sheet, 'I16', `Invoice No: ${payload.invoiceNo}`)
    setExcelCell(sheet, 'D22', `Sub: Bill for the Month of ${payload.monthName || 'June'} and Year of ${payload.year || '2026'}`)

    // 1. Unmerge all old template data rows from row 26 to 120
    const mergesToUnmerge = []
    ;(sheet.model.merges || []).forEach((m) => {
      const parts = m.split(':')
      const topRow = parseInt(parts[0].replace(/[^0-9]/g, ''), 10)
      if (topRow >= 26 && topRow <= 120) mergesToUnmerge.push(m)
    })
    mergesToUnmerge.forEach((m) => sheet.unMergeCells(m))

    // 2. Wipe 100% of old template data, formulas, and cell values
    for (let r = 26; r <= 120; r += 1) {
      const row = sheet.getRow(r)
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.value = null
      })
    }

    const grouped = rows.reduce((groups, item) => {
      const branch = item.branch || 'General Branch'
      groups[branch] = groups[branch] || []
      groups[branch].push(item)
      return groups
    }, {})

    let excelRow = 26
    let grandTotal = 0
    Object.entries(grouped).forEach(([branch, branchRows]) => {
      sheet.getCell(`D${excelRow}`).value = `${branch} Branch`
      try { sheet.mergeCells(`D${excelRow}:H${excelRow}`) } catch (err) {}
      excelRow += 1

      branchRows.forEach((item, index) => {
        const opinionFee = Number(item.opinionFee || item.amount) || 0
        const additionalFee = Number(item.additionalFee) || 0
        const total = Number(item.totalAmount) || opinionFee + additionalFee
        grandTotal += total

        sheet.getCell(`B${excelRow}`).value = index + 1
        sheet.getCell(`C${excelRow}`).value = item.customerId
        sheet.getCell(`D${excelRow}`).value = item.customerName || item.applicantName
        try { sheet.mergeCells(`D${excelRow}:F${excelRow}`) } catch (err) {}
        sheet.getCell(`G${excelRow}`).value = item.opinionDate || item.initiationDate
        try { sheet.mergeCells(`G${excelRow}:H${excelRow}`) } catch (err) {}
        sheet.getCell(`I${excelRow}`).value = opinionFee
        try { sheet.mergeCells(`I${excelRow}:J${excelRow}`) } catch (err) {}
        sheet.getCell(`L${excelRow}`).value = additionalFee || '--'
        sheet.getCell(`M${excelRow}`).value = total
        sheet.getCell(`N${excelRow}`).value = item.jobCardPrefix
        sheet.getCell(`O${excelRow}`).value = item.jobCardNo
        excelRow += 1
      })
    })

    sheet.getCell(`B${excelRow}`).value = `TOTAL (${totalToWords(grandTotal)})`
    try { sheet.mergeCells(`B${excelRow}:L${excelRow}`) } catch (err) {}
    sheet.getCell(`M${excelRow}`).value = grandTotal

    // Clear borders and values on all unused rows below the TOTAL row to remove black empty boxes
    for (let r = excelRow + 1; r <= 120; r += 1) {
      const unusedRow = sheet.getRow(r)
      unusedRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.value = null
        cell.border = {}
        cell.fill = { type: 'pattern', pattern: 'none' }
      })
    }

    const fileName = `${safeFilePart(payload.invoiceNo || payload.monthName)}-mlap-vendor-bill.xlsx`
    const filePath = path.join(generatedDir, fileName)
    await workbook.xlsx.writeFile(filePath)
    return `/generated/${fileName}`
  }

  // NIVARA Billing Export
  if (payload.invoiceNo) setExcelCell(sheet, 'C4', `Invoice No: ${payload.invoiceNo}`)
  if (payload.invoiceDate) setExcelCell(sheet, 'G4', payload.invoiceDate)
  setExcelCell(sheet, 'D7', `Sub: Bill for the Month of ${payload.monthName || 'July'} and Year of ${payload.year || '2026'}`)

  // 1. Unmerge all old template data rows from row 10 to 120
  const mergesToUnmerge = []
  ;(sheet.model.merges || []).forEach((m) => {
    const parts = m.split(':')
    const topRow = parseInt(parts[0].replace(/[^0-9]/g, ''), 10)
    if (topRow >= 10 && topRow <= 120) mergesToUnmerge.push(m)
  })
  mergesToUnmerge.forEach((m) => sheet.unMergeCells(m))

  // 2. Wipe 100% of old template data, formulas, and cell values
  for (let r = 10; r <= 120; r += 1) {
    const row = sheet.getRow(r)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null
    })
  }

  const grouped = rows.reduce((groups, item) => {
    const branch = item.branch || 'GENERAL'
    groups[branch] = groups[branch] || []
    groups[branch].push(item)
    return groups
  }, {})

  let excelRow = 10
  let grandTotal = 0
  Object.entries(grouped).forEach(([branch, branchRows]) => {
    sheet.getCell(`B${excelRow}`).value = branch.toUpperCase()
    try { sheet.mergeCells(`B${excelRow}:H${excelRow}`) } catch (err) {}
    excelRow += 1

    let branchTotal = 0
    branchRows.forEach((item, index) => {
      const amount = Number(item.amount) || 0
      branchTotal += amount
      grandTotal += amount

      sheet.getCell(`B${excelRow}`).value = index + 1
      sheet.getCell(`C${excelRow}`).value = item.applicantName
      sheet.getCell(`D${excelRow}`).value = item.initiationDate
      sheet.getCell(`E${excelRow}`).value = item.propertyLocation
      sheet.getCell(`F${excelRow}`).value = Number(item.distanceFromBranch) || item.distanceFromBranch
      sheet.getCell(`G${excelRow}`).value = item.stage || 'Fresh'
      sheet.getCell(`H${excelRow}`).value = amount
      sheet.getCell(`J${excelRow}`).value = item.jobCardPrefix
      sheet.getCell(`K${excelRow}`).value = item.jobCardNo
      excelRow += 1
    })

    sheet.getCell(`B${excelRow}`).value = 'Total'
    try { sheet.mergeCells(`B${excelRow}:F${excelRow}`) } catch (err) {}
    sheet.getCell(`G${excelRow}`).value = branchTotal
    try { sheet.mergeCells(`G${excelRow}:H${excelRow}`) } catch (err) {}
    excelRow += 1
  })

  sheet.getCell(`B${excelRow}`).value = 'Total Amount (In Rs.)'
  try { sheet.mergeCells(`B${excelRow}:F${excelRow}`) } catch (err) {}
  sheet.getCell(`G${excelRow}`).value = grandTotal
  try { sheet.mergeCells(`G${excelRow}:H${excelRow}`) } catch (err) {}
  excelRow += 1

  sheet.getCell(`B${excelRow}`).value = `Amount in words: ${totalToWords(grandTotal)}`
  try { sheet.mergeCells(`B${excelRow}:H${excelRow}`) } catch (err) {}

  for (let r = excelRow + 1; r <= 120; r += 1) {
    const unusedRow = sheet.getRow(r)
    unusedRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null
      cell.border = {}
      cell.fill = { type: 'pattern', pattern: 'none' }
    })
  }

  const fileName = `${safeFilePart(payload.invoiceNo || payload.monthName)}-vendor-bill.xlsx`
  const filePath = path.join(generatedDir, fileName)
  await workbook.xlsx.writeFile(filePath)
  return `/generated/${fileName}`
}

async function generateLeadsExport(leads, bankCode = 'ALL') {
  const workbook = new ExcelJS.Workbook()
  const isMaster = bankCode === 'ALL'
  const sheetTitle = isMaster ? 'Master All Leads' : `${bankCode} Leads`
  const sheet = workbook.addWorksheet(sheetTitle)

  sheet.views = [{ showGridLines: true }]
  sheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Received Date', key: 'receivedDate', width: 15 },
    { header: 'Bank Name', key: 'bank', width: 25 },
    { header: 'Branch Name', key: 'branch', width: 18 },
    { header: 'Bank Ref / App No', key: 'bankRefNo', width: 20 },
    { header: 'Customer Name', key: 'customer', width: 24 },
    { header: 'Customer Phone', key: 'customerPhone', width: 16 },
    { header: 'Property Location', key: 'location', width: 32 },
    { header: 'Loan / Case Type', key: 'loanType', width: 16 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Assigned Executive', key: 'assignedEmployee', width: 22 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Notes / Remarks', key: 'notes', width: 35 },
  ]

  sheet.insertRows(1, [
    [''],
    ['', '', isMaster ? 'CONSOLIDATED BANK LEADS MASTER REPORT' : 'BANK LEADS MANAGEMENT REPORT'],
    ['', '', `Exported Date: ${new Date().toLocaleDateString('en-GB')} | Total Recorded Cases: ${leads.length}`],
    [''],
    [''],
  ])

  sheet.mergeCells('C2:I2')
  const titleCell = sheet.getCell('C2')
  titleCell.value = isMaster ? 'CONSOLIDATED BANK LEADS MASTER REPORT (ALL BRANCHES & EMPLOYEES)' : `${bankCode} BANK LEADS MANAGEMENT REPORT`
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }

  sheet.mergeCells('C3:I3')
  const subTitleCell = sheet.getCell('C3')
  subTitleCell.value = `Exported Date: ${new Date().toLocaleDateString('en-GB')} | Total Recorded Cases: ${leads.length}`
  subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } }

  const headerRowIndex = 6
  const headerRow = sheet.getRow(headerRowIndex)
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  leads.forEach((lead, idx) => {
    const recDate = lead.receivedDate || (lead.createdAt ? new Date(lead.createdAt).toISOString().slice(0, 10) : '')
    const row = sheet.addRow({
      sno: idx + 1,
      receivedDate: recDate,
      bank: lead.bank || lead.bankCode || '-',
      branch: lead.branch || '-',
      bankRefNo: lead.bankRefNo || '-',
      customer: lead.customer,
      customerPhone: lead.customerPhone || '-',
      location: lead.location || '-',
      loanType: lead.loanType || '-',
      priority: lead.priority || 'Normal',
      assignedEmployee: lead.assignedEmployee || 'Unassigned',
      status: lead.status || 'NEW',
      notes: lead.notes || '-',
    })
    row.alignment = { vertical: 'middle', horizontal: 'left' }
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' }
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' }
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // When exporting Master Report, add Summary by Branch & Executive sheet
  if (isMaster) {
    const summarySheet = workbook.addWorksheet('Branch & Executive Summary')
    summarySheet.views = [{ showGridLines: true }]
    summarySheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Branch Name', key: 'branch', width: 22 },
      { header: 'Bank Name', key: 'bank', width: 25 },
      { header: 'Total Leads', key: 'totalCount', width: 14 },
      { header: 'Assigned Leads', key: 'assignedCount', width: 16 },
      { header: 'Unassigned Leads', key: 'unassignedCount', width: 16 },
    ]
    summarySheet.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }

    const branchSummary = {}
    leads.forEach((lead) => {
      const key = `${lead.branch || 'General'} - ${lead.bank || lead.bankCode || 'Bank'}`
      branchSummary[key] = branchSummary[key] || { branch: lead.branch || 'General', bank: lead.bank || lead.bankCode || 'Bank', totalCount: 0, assignedCount: 0, unassignedCount: 0 }
      branchSummary[key].totalCount += 1
      if (lead.assignedTo || lead.assignedEmployee) {
        branchSummary[key].assignedCount += 1
      } else {
        branchSummary[key].unassignedCount += 1
      }
    })

    Object.values(branchSummary).forEach((item, idx) => {
      summarySheet.addRow({
        sno: idx + 1,
        branch: item.branch,
        bank: item.bank,
        totalCount: item.totalCount,
        assignedCount: item.assignedCount,
        unassignedCount: item.unassignedCount,
      })
    })
  }

  const prefix = isMaster ? 'master-all-bank-leads' : `bank-leads-${bankCode.toLowerCase()}`
  const fileName = `${prefix}-${Date.now()}.xlsx`
  const filePath = path.join(generatedDir, fileName)
  await workbook.xlsx.writeFile(filePath)
  return `/generated/${fileName}`
}

async function createBootstrapAdmin() {
  const count = await User.countDocuments()
  if (count) return
  await User.create({
    name: process.env.ADMIN_NAME || 'Admin User',
    email: process.env.ADMIN_EMAIL || 'admin@banking.com',
    username: process.env.ADMIN_USERNAME || 'admin@banking.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
  })
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, username, password } = req.body
  const login = username || email
  const user = await User.findOne({ $or: [{ username: login }, { email: login }], password }).lean()
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  delete user.password
  res.json({ user: { ...user, id: String(user._id), _id: undefined } })
}))

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [totalLeads, assignedJobs, submittedReports, pendingBilling] = await Promise.all([
    Lead.countDocuments(),
    Job.countDocuments({ status: { $in: ['ASSIGNED', 'VISIT_STARTED', 'VISITED_SITE', 'DETAILS_UPDATED'] } }),
    Job.countDocuments({ status: { $in: ['SUBMITTED_FOR_VERIFICATION', 'VERIFIED'] } }),
    Job.countDocuments({ status: 'VERIFIED' }),
  ])
  res.json({
    stats: [
      { label: 'Total Leads', value: totalLeads },
      { label: 'Assigned Jobs', value: assignedJobs },
      { label: 'Submitted Reports', value: submittedReports },
      { label: 'Pending Billing', value: pendingBilling },
    ],
  })
}))

app.get('/api/banks', asyncRoute(async (_req, res) => {
  const banks = await BankTemplate.find({ active: true }).sort({ name: 1 })
  res.json(banks.map((bank) => bank.toJSON()))
}))

app.get('/api/bank-templates', asyncRoute(async (_req, res) => {
  const templates = await BankTemplate.find().sort({ name: 1 })
  res.json(templates.map((template) => template.toJSON()))
}))

app.post('/api/bank-templates', asyncRoute(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase()
  if (!req.body.name || !code) {
    return res.status(400).json({ message: 'Bank name and bank code are required' })
  }
  const builtIn = getBuiltInTemplate(code)
  const template = await BankTemplate.create({
    name: req.body.name,
    code,
    active: req.body.active ?? true,
    branchName: req.body.branchName || builtIn.branchName || '',
    gstNo: req.body.gstNo || builtIn.gstNo || '',
    contactPerson: req.body.contactPerson || builtIn.contactPerson || '',
    phone: req.body.phone || builtIn.phone || '',
    email: req.body.email || builtIn.email || '',
    address: req.body.address || builtIn.address || '',
    reportTemplate: builtIn.reportTemplate || '',
    billingTemplate: builtIn.billingTemplate || '',
    reportFields: builtIn.reportFields || [],
    billFields: builtIn.billFields || [],
  })
  res.status(201).json({ success: true, template: template.toJSON() })
}))

app.put('/api/bank-templates/:templateId', asyncRoute(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.templateId)) {
    return res.status(400).json({ message: 'Invalid bank id' })
  }
  const code = String(req.body.code || '').trim().toUpperCase()
  if (!req.body.name || !code) {
    return res.status(400).json({ message: 'Bank name and bank code are required' })
  }
  const builtIn = getBuiltInTemplate(code)
  const template = await BankTemplate.findByIdAndUpdate(
    req.params.templateId,
    {
      name: req.body.name,
      code,
      active: req.body.active ?? true,
      branchName: req.body.branchName || builtIn.branchName || '',
      address: req.body.address || builtIn.address || '',
      gstNo: req.body.gstNo || builtIn.gstNo || '',
      contactPerson: req.body.contactPerson || builtIn.contactPerson || '',
      phone: req.body.phone || builtIn.phone || '',
      email: req.body.email || builtIn.email || '',
      reportTemplate: builtIn.reportTemplate || '',
      billingTemplate: builtIn.billingTemplate || '',
      reportFields: builtIn.reportFields || [],
      billFields: builtIn.billFields || [],
    },
    { new: true },
  )
  if (!template) return res.status(404).json({ message: 'Bank not found' })
  res.json({ success: true, template: template.toJSON() })
}))

app.delete('/api/bank-templates/:templateId', asyncRoute(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.templateId)) {
    return res.status(400).json({ message: 'Invalid bank id' })
  }
  const template = await BankTemplate.findByIdAndDelete(req.params.templateId)
  if (!template) return res.status(404).json({ message: 'Bank not found' })
  res.json({ success: true })
}))

app.get('/api/leads', asyncRoute(async (_req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 })
  res.json(leads.map((lead) => lead.toJSON()))
}))

app.post('/api/leads', asyncRoute(async (req, res) => {
  const bankCode = String(req.body.bankCode || 'UJJ').toUpperCase()
  const template = await BankTemplate.findOne({ code: bankCode })
  let employee = null
  if (req.body.employeeId) {
    employee = await User.findOne({ _id: req.body.employeeId, role: 'field' })
  }

  const leadData = {
    customer: req.body.customer || 'New Customer',
    customerPhone: req.body.customerPhone || '',
    bank: template?.name || req.body.bank || (bankCode === 'NIVARA' ? 'Nivara Home Finance Limited' : 'Ujjivan Small Finance Bank'),
    bankCode: template?.code || bankCode,
    branch: req.body.branch || template?.branchName || '',
    location: req.body.location || '',
    loanType: req.body.loanType || '',
    bankRefNo: req.body.bankRefNo || '',
    receivedDate: req.body.receivedDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    priority: req.body.priority || 'Normal',
    notes: req.body.notes || '',
    status: employee ? 'ASSIGNED' : (req.body.status || 'NEW'),
    assignedTo: employee?._id || null,
    assignedEmployee: employee?.name || '',
  }

  const lead = await Lead.create(leadData)

  let job = null
  if (employee) {
    job = await Job.create({
      leadId: lead._id,
      bank: lead.bank,
      bankCode: lead.bankCode,
      branch: lead.branch,
      customer: lead.customer,
      location: lead.location,
      assignedTo: employee._id,
      assignedEmployee: employee.name,
      status: 'ASSIGNED',
      taskDetails: {
        loanType: lead.loanType,
        customerPhone: lead.customerPhone,
        notes: lead.notes,
        bankRefNo: lead.bankRefNo,
      },
      visitDetails: {},
    })
  }

  res.status(201).json({ success: true, lead: lead.toJSON(), job: job ? job.toJSON() : null })
}))

app.put('/api/leads/:leadId', asyncRoute(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.leadId)) {
    return res.status(400).json({ message: 'Invalid lead id' })
  }

  const lead = await Lead.findById(req.params.leadId)
  if (!lead) return res.status(404).json({ message: 'Lead not found' })

  let employee = null
  if (req.body.employeeId) {
    employee = await User.findOne({ _id: req.body.employeeId, role: 'field' })
  }

  if (req.body.customer !== undefined) lead.customer = req.body.customer
  if (req.body.customerPhone !== undefined) lead.customerPhone = req.body.customerPhone
  if (req.body.bank !== undefined) lead.bank = req.body.bank
  if (req.body.bankCode !== undefined) lead.bankCode = String(req.body.bankCode).toUpperCase()
  if (req.body.branch !== undefined) lead.branch = req.body.branch
  if (req.body.location !== undefined) lead.location = req.body.location
  if (req.body.loanType !== undefined) lead.loanType = req.body.loanType
  if (req.body.bankRefNo !== undefined) lead.bankRefNo = req.body.bankRefNo
  if (req.body.receivedDate !== undefined) lead.receivedDate = req.body.receivedDate
  if (req.body.priority !== undefined) lead.priority = req.body.priority
  if (req.body.notes !== undefined) lead.notes = req.body.notes
  if (req.body.status !== undefined) lead.status = req.body.status

  if (employee) {
    lead.assignedTo = employee._id
    lead.assignedEmployee = employee.name
    lead.status = 'ASSIGNED'

    let job = await Job.findOne({ leadId: lead._id })
    if (!job) {
      job = new Job({ leadId: lead._id, visitDetails: {} })
    }
    job.bank = lead.bank
    job.bankCode = lead.bankCode
    job.branch = lead.branch
    job.customer = lead.customer
    job.location = lead.location
    job.assignedTo = employee._id
    job.assignedEmployee = employee.name
    job.status = 'ASSIGNED'
    await job.save()
  }

  await lead.save()
  res.json({ success: true, lead: lead.toJSON() })
}))

app.delete('/api/leads/:leadId', asyncRoute(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.leadId)) {
    return res.status(400).json({ message: 'Invalid lead id' })
  }
  const lead = await Lead.findByIdAndDelete(req.params.leadId)
  if (!lead) return res.status(404).json({ message: 'Lead not found' })
  await Job.deleteMany({ leadId: lead._id })
  res.json({ success: true })
}))

app.post('/api/leads/export', asyncRoute(async (req, res) => {
  const bankCode = String(req.body.bankCode || 'ALL').toUpperCase()
  const query = (bankCode && bankCode !== 'ALL') ? { bankCode } : {}
  const leads = await Lead.find(query).sort({ createdAt: -1 })
  const fileUrl = await generateLeadsExport(leads, bankCode)
  res.json({ success: true, fileUrl })
}))

app.get('/api/jobs', asyncRoute(async (_req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 })
  res.json(jobs.map((job) => job.toJSON()))
}))

app.get('/api/branches', asyncRoute(async (_req, res) => {
  const branches = await Lead.distinct('branch', { branch: { $ne: '' } })
  res.json(branches.map((branch, index) => ({ id: `branch-${index + 1}`, name: branch, active: true })))
}))

app.get('/api/users', asyncRoute(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 })
  res.json(users.map((user) => user.toJSON()))
}))

app.post('/api/users', asyncRoute(async (req, res) => {
  const { name, email, username, password, phone } = req.body
  if (!name || !username || !password) return res.status(400).json({ message: 'Name, username, and password are required' })

  const exists = await User.exists({ $or: [{ username }, ...(email ? [{ email }] : [])] })
  if (exists) return res.status(409).json({ message: 'Employee username or email already exists' })

  const user = await User.create({ name, email: email || username, username, password, phone: phone || '', role: 'field' })
  res.status(201).json({ success: true, user: user.toJSON() })
}))

app.delete('/api/users/:userId', asyncRoute(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ message: 'Invalid user id' })
  }
  const user = await User.findById(req.params.userId)
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin account' })
  await User.findByIdAndDelete(req.params.userId)
  res.json({ success: true })
}))

app.post('/api/leads/:leadId/assign', asyncRoute(async (req, res) => {
  const lead = await Lead.findById(req.params.leadId)
  if (!lead) return res.status(404).json({ message: 'Lead not found' })

  const employee = await User.findOne({ _id: req.body.employeeId, role: 'field' })
  if (!employee) return res.status(400).json({ message: 'Select a valid field employee' })

  const template = await BankTemplate.findOne({ code: req.body.bankCode || lead.bankCode })
  lead.bank = template?.name || lead.bank
  lead.bankCode = template?.code || lead.bankCode
  lead.assignedTo = employee._id
  lead.assignedEmployee = employee.name

  let job = await Job.findOne({ leadId: lead._id })
  if (!job) {
    job = new Job({
      leadId: lead._id,
      branch: lead.branch,
      customer: lead.customer,
      location: lead.location,
      visitDetails: {},
    })
  }

  job.bank = lead.bank
  job.bankCode = lead.bankCode
  job.assignedTo = employee._id
  job.assignedEmployee = employee.name
  job.status = 'ASSIGNED'
  lead.status = 'ASSIGNED'
  await Promise.all([lead.save(), job.save()])

  res.json({ success: true, job: job.toJSON() })
}))

app.post('/api/tasks', asyncRoute(async (req, res) => {
  const employee = await User.findOne({ _id: req.body.employeeId, role: 'field' })
  if (!employee) return res.status(400).json({ message: 'Select a valid field employee' })

  const template = await BankTemplate.findOne({ code: req.body.bankCode })
  const lead = await Lead.create({
    customer: req.body.customer || 'New Customer',
    customerPhone: req.body.customerPhone || '',
    bank: template?.name || '',
    bankCode: template?.code || req.body.bankCode || '',
    branch: req.body.branch || '',
    location: req.body.location || '',
    loanType: req.body.loanType || '',
    notes: req.body.notes || '',
    status: 'ASSIGNED',
    assignedTo: employee._id,
    assignedEmployee: employee.name,
  })

  const job = await Job.create({
    leadId: lead._id,
    bank: lead.bank,
    bankCode: lead.bankCode,
    branch: lead.branch,
    customer: lead.customer,
    location: lead.location,
    assignedTo: employee._id,
    assignedEmployee: employee.name,
    status: 'ASSIGNED',
    taskDetails: {
      loanType: req.body.loanType || '',
      customerPhone: req.body.customerPhone || '',
      dueDate: req.body.dueDate || '',
      notes: req.body.notes || '',
    },
    visitDetails: {},
  })

  res.status(201).json({ success: true, lead: lead.toJSON(), job: job.toJSON() })
}))

app.delete('/api/jobs/:jobId', asyncRoute(async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.jobId)
  if (!job) return res.status(404).json({ message: 'Job not found' })
  if (job.leadId) await Lead.findByIdAndUpdate(job.leadId, { status: 'NEW', assignedTo: null, assignedEmployee: '' })
  res.json({ success: true })
}))

app.patch('/api/jobs/:jobId/status', asyncRoute(async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.jobId,
    { status: req.body.status, statusNote: req.body.statusNote || '' },
    { new: true },
  )
  if (!job) return res.status(404).json({ message: 'Job not found' })
  res.json({ success: true, job: job.toJSON() })
}))

app.post('/api/jobs/:jobId/submit', asyncRoute(async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.jobId,
    {
      visitDetails: req.body,
      sitePhotos: req.body.sitePhotos || [],
      visitedAt: new Date(),
      status: 'SUBMITTED_FOR_VERIFICATION',
    },
    { new: true },
  )
  if (!job) return res.status(404).json({ message: 'Job not found' })
  res.json({ success: true, job: job.toJSON() })
}))

app.post('/api/jobs/:jobId/vendor-bill', asyncRoute(async (req, res) => {
  const billData = {
    ...req.body,
    submitted: true,
    submittedAt: new Date(),
  }
  const job = await Job.findByIdAndUpdate(
    req.params.jobId,
    { vendorBillDetails: billData },
    { new: true },
  )
  if (!job) return res.status(404).json({ message: 'Job not found' })
  res.json({ success: true, job: job.toJSON() })
}))

app.post('/api/jobs/:jobId/verify', asyncRoute(async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.jobId,
    {
      status: req.body.approved ? 'VERIFIED' : 'REVISION_REQUIRED',
      verificationRemarks: req.body.remarks || '',
    },
    { new: true },
  )
  if (!job) return res.status(404).json({ message: 'Job not found' })
  res.json({ success: true, job: job.toJSON() })
}))

app.post('/api/reports/:jobId/generate', asyncRoute(async (req, res) => {
  const job = await Job.findById(req.params.jobId).lean()
  if (!job) return res.status(404).json({ message: 'Job not found' })
  const fileUrl = await generateTechnicalReport({ ...job, ...job.visitDetails, ...req.body })
  res.json({ success: true, fileUrl, reportId: `REP-${Date.now()}` })
}))

app.post('/api/billing/generate', asyncRoute(async (req, res) => {
  const fileUrl = await generateVendorBill(req.body)
  res.json({ success: true, fileUrl, month: req.body.month || '2026-07' })
}))

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.code === 11000) {
    return res.status(409).json({ message: 'This record already exists' })
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message })
  }
  res.status(500).json({ message: error.message || 'Server error' })
})

// Health check endpoint for Docker and load balancers
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'banking-leads-backend' })
})

// Root API info endpoint
app.get('/api', (_req, res) => {
  res.json({ name: 'Banking Leads Management API', version: '1.0.0', status: 'running' })
})

// Serve frontend in local/monorepo dev mode only (not used in Docker — frontend is a separate Nginx container)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
} else {
  // In Docker: frontend is served by a separate Nginx container
  app.get('*', (_req, res) => {
    res.status(404).json({ message: 'Route not found. Frontend is served separately on port 8088.' })
  })
}

async function start() {
  await mongoose.connect(mongoUri)
  await createBootstrapAdmin()
  const PORT = process.env.PORT || 3000
  const server = app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`)
    console.log(`MongoDB connected: ${mongoUri}`)
  })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`)
      process.exit(1)
    }
  })
}

start().catch((error) => {
  console.error('Failed to start backend')
  console.error(error)
  process.exit(1)
})
