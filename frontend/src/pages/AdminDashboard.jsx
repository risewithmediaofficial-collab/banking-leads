import { useEffect, useMemo, useState, useRef } from 'react'
import {
  LayoutDashboard,
  FolderPlus,
  PlusCircle,
  ListChecks,
  CheckCircle2,
  BarChart3,
  Receipt,
  Users,
  Building2,
  Plus,
  FileSpreadsheet,
  Download,
  Edit3,
  Trash2,
  X,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react'
import { getBillingSummary } from '../services/api'
import { mediaUrl, handleImageError } from '../services/media.js'
import PropertyCaseForm from './PropertyCaseForm.jsx'


/* ─── Constants ─── */
const billingDefaults = { bankCode: 'UJJ', invoiceNo: '007RKD/NHF/AUG/2026', invoiceDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), monthName: 'August', year: '2026' }
const emptyBillingRow = { branch: 'KRISHNAGIRI', applicantName: '', initiationDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), propertyLocation: '', distanceFromBranch: '', stage: 'Fresh', amount: '1500', additionalFee: '', totalAmount: '', customerId: '', jobCardPrefix: 'K', jobCardNo: '', opinionDate: '', opinionFee: '', customerName: '' }
const reportDefaults = { refNo: '', reportDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), branchName: '', caseType: 'LAP', valuerName: 'Er. V. Ramesh Babu B.E.,(Civil)', contactedPerson: '', applicantName: '', ownerName: '', propertyType: 'Residential', currentUsage: 'Residential', siteAddress: '', documentAddress: '', landmark: '', distanceFromBranch: '', occupancy: 'Occupied', relationship: 'Applicant', identifiedThrough: 'Document boundaries', plotArea: '', floors: '', rooms: '', carpetArea: '', builtUpArea: '', propertyAge: '', residualLife: '', documentsVerified: '', totalValue: '', northBoundary: '', southBoundary: '', eastBoundary: '', westBoundary: '', boundariesMatching: 'Yes', negativeArea: 'No', latitude: '', longitude: '', observation: '', remarks: '' }

const emptyLeadForm = { customer: '', customerPhone: '', bankCode: 'UJJ', branch: '', location: '', loanType: 'LAP', bankRefNo: '', receivedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), priority: 'Normal', notes: '', employeeId: '' }

const SECTION_NAMES = {
  overview: 'Dashboard',
  leads: 'Bank Leads',
  tasks: 'All Tasks',
  verify: 'Verify Work',
  report: 'Technical Reports',
  billing: 'Vendor Billing',
  employees: 'Employees',
  banks: 'Banks',
  'lead-form': 'Bank Leads',
  'task-form': 'All Tasks',
  'vendor-bill-detail': 'Vendor Billing',
  'report-detail': 'Technical Reports',
}

const STATUS_COLOR = { NEW: 'badge-blue', ASSIGNED: 'badge-amber', VISIT_STARTED: 'badge-amber', VISITED_SITE: 'badge-purple', DETAILS_UPDATED: 'badge-purple', SUBMITTED_FOR_VERIFICATION: 'badge-blue', VERIFIED: 'badge-green', REVISION_REQUIRED: 'badge-red', COMPLETED: 'badge-green' }

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

function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange, onClear }) {
  return (
    <div className="date-range-filter-box">
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-600)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        📅 Date Range:
      </span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>From</span>
        <input
          type="date"
          className="form-input"
          style={{ padding: '4px 8px', fontSize: '0.78rem', height: 28, width: 'auto', background: '#fff' }}
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>To</span>
        <input
          type="date"
          className="form-input"
          style={{ padding: '4px 8px', fontSize: '0.78rem', height: 28, width: 'auto', background: '#fff' }}
          value={endDate || ''}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
      {(startDate || endDate) && (
        <button
          type="button"
          className="secondary-btn"
          style={{ padding: '3px 8px', fontSize: '0.72rem', height: 28, color: 'var(--red-600)', borderColor: 'var(--red-200)' }}
          onClick={onClear}
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}

function Icon({ id }) {
  const map = {
    overview: <LayoutDashboard size={18} color="#2563eb" />,
    leads: <FolderPlus size={18} color="#059669" />,
    task: <PlusCircle size={18} color="#d97706" />,
    tasks: <ListChecks size={18} color="#9333ea" />,
    verify: <CheckCircle2 size={18} color="#0891b2" />,
    report: <BarChart3 size={18} color="#4f46e5" />,
    billing: <Receipt size={18} color="#c026d3" />,
    employees: <Users size={18} color="#ea580c" />,
    banks: <Building2 size={18} color="#2563eb" />,
  }
  return map[id] || null
}

function AdminDashboard({ dashboardData, banks, bankTemplates, leads, jobs, users, loading, onRefresh, onCreateLead, onUpdateLead, onDeleteLead, onExportLeads, onCreateBankTemplate, onUpdateBankTemplate, onDeleteBankTemplate, onCreateEmployee, onDeleteEmployee, onCreateTask, onAssignLead, onSubmitJob, onDeleteJob, onVerifyJob, onGenerateReport, onGenerateBilling, onSubmitVendorBill }) {
  const stats = dashboardData?.stats || []
  const fieldUsers = users.filter((u) => u.role === 'field')

  const [activeSection, setActiveSection] = useState('overview')
  const [editingJobForm, setEditingJobForm] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const mobileToggleRef = useRef(null)
  const sidebarRef = useRef(null)


  useEffect(() => {
    if (!isMobileMenuOpen) return
    const prevFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFirst = () => {
      const focusable = sidebarRef.current?.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')
      if (focusable && focusable.length) focusable[0].focus()
    }
    focusFirst()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { setIsMobileMenuOpen(false); return }
      if (e.key === 'Tab') {
        const focusable = sidebarRef.current?.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])') || []
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    const onResize = () => setIsMobileMenuOpen(false)
    window.addEventListener('orientationchange', onResize)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('orientationchange', onResize)
      window.removeEventListener('resize', onResize)
      document.body.style.overflow = prevOverflow
      try { if (prevFocused && prevFocused.focus) prevFocused.focus() } catch (e) {}
    }
  }, [isMobileMenuOpen])

  // Date Filter States
  const [overviewFromDate, setOverviewFromDate] = useState('')
  const [overviewToDate, setOverviewToDate] = useState('')

  const [leadFromDate, setLeadFromDate] = useState('')
  const [leadToDate, setLeadToDate] = useState('')

  const [taskFromDate, setTaskFromDate] = useState('')
  const [taskToDate, setTaskToDate] = useState('')

  const [verifyFromDate, setVerifyFromDate] = useState('')
  const [verifyToDate, setVerifyToDate] = useState('')

  const [billingFromDate, setBillingFromDate] = useState('')
  const [billingToDate, setBillingToDate] = useState('')
  const [leadForm, setLeadForm] = useState(emptyLeadForm)
  const [editingLeadId, setEditingLeadId] = useState('')
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadSearchQuery, setLeadSearchQuery] = useState('')
  const [bankFilter, setBankFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedLeadForTask, setSelectedLeadForTask] = useState('')
  const [taskForm, setTaskForm] = useState({ customer: '', customerPhone: '', bankCode: 'UJJ', branch: '', location: '', loanType: '', dueDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), notes: '', employeeId: '' })
  const [showAddTask, setShowAddTask] = useState(false)
  const [reportForm, setReportForm] = useState(reportDefaults)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [billingForm, setBillingForm] = useState(billingDefaults)
  const [billingRows, setBillingRows] = useState([{ ...emptyBillingRow }])
  const [billingPeriod, setBillingPeriod] = useState('all')
  const [billingViewMode, setBillingViewMode] = useState('generate')
  const [billingSummary, setBillingSummary] = useState(null)
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', username: '', password: '', phone: '' })
  const [showEmpPassword, setShowEmpPassword] = useState(false)
  const [bankForm, setBankForm] = useState({ name: '', code: '', branchName: '', address: '' })
  const [editingBankId, setEditingBankId] = useState('')
  const [assignments, setAssignments] = useState({})
  const [verifyRemarks, setVerifyRemarks] = useState({})
  const [viewingBillJob, setViewingBillJob] = useState(null)
  const [isEditingModal, setIsEditingModal] = useState(false)
  const [editBillForm, setEditBillForm] = useState({})
  const [viewingReportJob, setViewingReportJob] = useState(null)
  const [isEditingReportModal, setIsEditingReportModal] = useState(false)

  // Section Filter States
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [taskBankFilter, setTaskBankFilter] = useState('ALL')
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL')
  const [taskEmployeeFilter, setTaskEmployeeFilter] = useState('ALL')

  const [verifySearchQuery, setVerifySearchQuery] = useState('')
  const [verifyStatusFilter, setVerifyStatusFilter] = useState('ALL')

  const [billingSearchQuery, setBillingSearchQuery] = useState('')
  const [billingBankFilter, setBillingBankFilter] = useState('ALL')
  const [billingStatusFilter, setBillingStatusFilter] = useState('ALL')

  const filteredTasks = useMemo(() => {
    return jobs.filter((job) => {
      if (taskBankFilter !== 'ALL' && (job.bankCode || '').toUpperCase() !== taskBankFilter.toUpperCase()) return false
      if (taskStatusFilter !== 'ALL' && job.status !== taskStatusFilter) return false
      if (taskEmployeeFilter !== 'ALL' && job.assignedEmployee !== taskEmployeeFilter && job.assignedTo !== taskEmployeeFilter) return false
      if (!isDateInRange(job.initiationDate || job.createdAt || job.dueDate || job.visitedAt, taskFromDate, taskToDate)) return false
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase()
        return (
          (job.customer || '').toLowerCase().includes(q) ||
          (job.bank || '').toLowerCase().includes(q) ||
          (job.assignedEmployee || '').toLowerCase().includes(q) ||
          (job.location || '').toLowerCase().includes(q) ||
          (job.id || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [jobs, taskBankFilter, taskStatusFilter, taskEmployeeFilter, taskFromDate, taskToDate, taskSearchQuery])

  const filteredVerifyJobs = useMemo(() => {
    return jobs.filter((job) => {
      const isPending = ['SUBMITTED_FOR_VERIFICATION', 'REVISION_REQUIRED', 'VERIFIED'].includes(job.status)
      if (!isPending) return false
      if (verifyStatusFilter !== 'ALL' && job.status !== verifyStatusFilter) return false
      if (!isDateInRange(job.submittedAt || job.visitedAt || job.opinionDate || job.createdAt, verifyFromDate, verifyToDate)) return false
      if (verifySearchQuery.trim()) {
        const q = verifySearchQuery.toLowerCase()
        return (
          (job.customer || '').toLowerCase().includes(q) ||
          (job.bank || '').toLowerCase().includes(q) ||
          (job.assignedEmployee || '').toLowerCase().includes(q) ||
          (job.location || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [jobs, verifyStatusFilter, verifyFromDate, verifyToDate, verifySearchQuery])

  const filteredBillingJobs = useMemo(() => {
    return jobs.filter((job) => {
      const b = job.vendorBillDetails || {}
      const isSubmitted = b.submitted || job.status === 'SUBMITTED_FOR_VERIFICATION' || job.status === 'VERIFIED'
      if (billingBankFilter !== 'ALL' && (job.bankCode || '').toUpperCase() !== billingBankFilter.toUpperCase()) return false
      if (billingStatusFilter === 'SUBMITTED' && !isSubmitted) return false
      if (billingStatusFilter === 'PENDING' && isSubmitted) return false
      if (!isDateInRange(b.opinionDate || b.initiationDate || job.submittedAt || job.visitedAt || job.createdAt, billingFromDate, billingToDate)) return false
      if (billingSearchQuery.trim()) {
        const q = billingSearchQuery.toLowerCase()
        return (
          (job.customer || '').toLowerCase().includes(q) ||
          (job.bank || '').toLowerCase().includes(q) ||
          (job.assignedEmployee || '').toLowerCase().includes(q) ||
          (b.jobCardNo || '').toLowerCase().includes(q) ||
          (b.customerId || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [jobs, billingBankFilter, billingStatusFilter, billingFromDate, billingToDate, billingSearchQuery])

  useEffect(() => {
    if (viewingBillJob) {
      const b = viewingBillJob.vendorBillDetails || {}
      setEditBillForm({
        customerId: b.customerId || viewingBillJob.customerAppNo || viewingBillJob.id || '',
        opinionDate: b.opinionDate || (viewingBillJob.visitedAt ? new Date(viewingBillJob.visitedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        opinionFee: b.opinionFee !== undefined ? b.opinionFee : 1500,
        additionalFee: b.additionalFee || 0,
        jobCardPrefix: b.jobCardPrefix || 'K',
        jobCardNo: b.jobCardNo || '',
        remarks: b.remarks || '',
      })
      setIsEditingModal(false)
    }
  }, [viewingBillJob])

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) || null, [jobs, selectedJobId])

  useEffect(() => {
    if (activeSection === 'billing') {
      getBillingSummary(billingPeriod).then(setBillingSummary).catch(console.error)

      // Auto pre-fill submitted vendor bills from field employees
      const submittedJobs = jobs.filter((j) => j.vendorBillDetails?.submitted)
      if (submittedJobs.length > 0) {
        const newRows = submittedJobs.map((j) => ({
          branch: j.branch || 'Branch',
          customerId: j.vendorBillDetails?.customerId || j.id,
          customerName: j.customer,
          applicantName: j.customer,
          opinionDate: j.vendorBillDetails?.opinionDate || new Date().toISOString().split('T')[0],
          initiationDate: j.vendorBillDetails?.opinionDate || new Date().toISOString().split('T')[0],
          opinionFee: j.vendorBillDetails?.opinionFee || 1500,
          additionalFee: j.vendorBillDetails?.additionalFee || 0,
          totalAmount: j.vendorBillDetails?.totalAmount || 1500,
          amount: j.vendorBillDetails?.totalAmount || 1500,
          jobCardPrefix: j.vendorBillDetails?.jobCardPrefix || 'K',
          jobCardNo: j.vendorBillDetails?.jobCardNo || '',
          propertyLocation: j.location || '',
          distanceFromBranch: j.visitDetails?.distanceFromBranch || '0',
          stage: j.status || 'Fresh',
        }))
        setBillingRows(newRows)
      }
    }
  }, [activeSection, billingPeriod, jobs])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    if (bankFilter !== 'ALL' && (lead.bankCode || '').toUpperCase() !== bankFilter) return false
    if (statusFilter !== 'ALL' && (lead.status || 'NEW').toUpperCase() !== statusFilter) return false
    if (!isDateInRange(lead.receivedDate || lead.createdAt || lead.date, leadFromDate, leadToDate)) return false
    if (leadSearchQuery.trim()) {
      const q = leadSearchQuery.toLowerCase()
      return (lead.customer || '').toLowerCase().includes(q) || (lead.customerPhone || '').includes(q) || (lead.bankRefNo || '').toLowerCase().includes(q) || (lead.branch || '').toLowerCase().includes(q) || (lead.location || '').toLowerCase().includes(q)
    }
    return true
  }), [leads, bankFilter, statusFilter, leadFromDate, leadToDate, leadSearchQuery])

  /* ─── Handlers ─── */
  const handleLeadSubmit = async (e) => {
    e.preventDefault()
    if (!leadForm.customer.trim()) return showMsg('Customer name is required', 'error')
    try {
      if (editingLeadId) { await onUpdateLead(editingLeadId, leadForm); showMsg('Lead updated') }
      else { await onCreateLead(leadForm); showMsg('Lead noted and saved') }
      setEditingLeadId(''); setLeadForm(emptyLeadForm); setShowLeadModal(false); setActiveSection('leads')
    } catch (err) { showMsg(err.message, 'error') }
  }

  const handleEditLead = (lead) => {
    const leadId = lead.id || lead._id
    setEditingLeadId(leadId)
    setLeadForm({ customer: lead.customer || '', customerPhone: lead.customerPhone || '', bankCode: lead.bankCode || 'UJJ', branch: lead.branch || '', location: lead.location || '', loanType: lead.loanType || 'LAP', bankRefNo: lead.bankRefNo || '', receivedDate: lead.receivedDate || '', priority: lead.priority || 'Normal', notes: lead.notes || '', employeeId: lead.assignedTo || '' })
    setActiveSection('lead-form')
  }

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Delete this lead?')) return
    try { await onDeleteLead(leadId); showMsg('Lead deleted') } catch (err) { showMsg(err.message, 'error') }
  }

  const handleExport = async (bankCode) => {
    try { await onExportLeads({ bankCode }); showMsg('Excel report downloaded') } catch (err) { showMsg(err.message, 'error') }
  }

  const handleBankSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...bankForm, name: bankForm.name.trim(), code: bankForm.code.trim().toUpperCase() }
    if (!payload.name || !payload.code) return showMsg('Bank name and code are required', 'error')
    try {
      if (editingBankId) { await onUpdateBankTemplate(editingBankId, payload); showMsg('Bank updated'); setEditingBankId('') }
      else { await onCreateBankTemplate(payload); showMsg('Bank added') }
      setBankForm({ name: '', code: '', branchName: '', address: '' })
    } catch (err) { showMsg(err.message, 'error') }
  }

  const handleDeleteEmployee = async (userId, name) => {
    if (!window.confirm(`Delete employee "${name}"? Their tasks will remain but will be unassigned.`)) return
    try { await onDeleteEmployee(userId); showMsg('Employee deleted') } catch (err) { showMsg(err.message, 'error') }
  }

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault()
    try { await onCreateEmployee(employeeForm); setEmployeeForm({ name: '', email: '', username: '', password: '', phone: '' }); showMsg('Employee added successfully') } catch (err) { showMsg(err.message, 'error') }
  }

  const selectLeadForTask = (leadId) => {
    setSelectedLeadForTask(leadId)
    const lead = leads.find((l) => (l.id || l._id) === leadId)
    if (!lead) return
    setTaskForm((prev) => ({ ...prev, customer: lead.customer || '', customerPhone: lead.customerPhone || '', bankCode: lead.bankCode || 'UJJ', branch: lead.branch || '', location: lead.location || '', loanType: lead.loanType || '', notes: lead.bankRefNo ? `Bank Ref: ${lead.bankRefNo}` : '', employeeId: lead.assignedTo || fieldUsers[0]?.id || '' }))
    setActiveSection('task-form')
  }

  const [submittingTask, setSubmittingTask] = useState(false)
  const [exportingBank, setExportingBank] = useState('')
  const [savingBill, setSavingBill] = useState(false)
  const handleTaskSubmit = async (e) => {
    e.preventDefault()
    if (submittingTask) return
    setSubmittingTask(true)
    try {
      // If a lead was selected for quick-fill, assign that lead instead of creating a duplicate
      if (selectedLeadForTask) {
        const empId = taskForm.employeeId || fieldUsers[0]?.id
        await onAssignLead(selectedLeadForTask, empId, taskForm.bankCode || 'UJJ')
        showMsg('Task assigned to employee')
      } else {
        await onCreateTask({ ...taskForm, employeeId: taskForm.employeeId || fieldUsers[0]?.id })
        showMsg('Task created and assigned to employee')
      }
      setTaskForm({ customer: '', customerPhone: '', bankCode: 'UJJ', branch: '', location: '', loanType: '', dueDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), notes: '', employeeId: '' })
      setSelectedLeadForTask('')
      setActiveSection('tasks')
      onRefresh()
    } catch (err) {
      showMsg(err.message, 'error')
    } finally {
      setSubmittingTask(false)
    }
  }

  const handleAssign = async (leadId) => {
    const empId = assignments[leadId] || fieldUsers[0]?.id
    const lead = leads.find((l) => l.id === leadId)
    if (!empId) return showMsg('Select an employee first', 'error')
    try { await onAssignLead(leadId, empId, lead?.bankCode || 'UJJ'); showMsg('Lead assigned') } catch (err) { showMsg(err.message, 'error') }
  }

  const handleVerify = async (jobId, approved) => {
    const remarks = verifyRemarks[jobId] || (approved ? 'Verified by admin' : 'Needs correction')
    try { await onVerifyJob(jobId, { approved, remarks }); showMsg(approved ? 'Work verified ✓' : 'Sent back for correction') } catch (err) { showMsg(err.message, 'error') }
  }

  const handleGenerateReport = async (e) => {
    e.preventDefault()
    if (!selectedJob) return showMsg('Select a task/job first from Tasks panel', 'error')
    try {
      await onGenerateReport(selectedJob.id, { ...reportForm, applicantName: reportForm.applicantName || selectedJob.customer, branchName: reportForm.branchName || selectedJob.branch, sitePhotos: selectedJob.sitePhotos || [] })
      showMsg('Technical report generated and opened for download')
    } catch (err) { showMsg(err.message, 'error') }
  }

  const handleBillingSubmit = async (e) => {
    e.preventDefault()
    try { await onGenerateBilling({ ...billingForm, cases: billingRows }); showMsg('Vendor bill Excel generated and downloaded') } catch (err) { showMsg(err.message, 'error') }
  }

  const fillFromJob = (job) => {
    const v = job.visitDetails || {}
    setReportForm((prev) => ({ ...prev, ...v, branchName: job.branch || prev.branchName, applicantName: job.customer || prev.applicantName, ownerName: v.ownerName || job.customer || prev.ownerName, siteAddress: v.siteAddress || job.location || prev.siteAddress, caseRefNo: job.id }))
    setSelectedJobId(job.id)
    setActiveSection('report')
  }

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: 'overview' },
    { id: 'leads', label: 'Bank Leads', icon: 'leads', badge: leads.filter((l) => l.status === 'NEW').length || null },
    // 'Add Task' moved into All Tasks view as an inline form
    { id: 'tasks', label: 'All Tasks', icon: 'tasks', badge: jobs.filter((j) => j.status === 'SUBMITTED_FOR_VERIFICATION').length || null },
    { id: 'verify', label: 'Verify Work', icon: 'verify', badge: jobs.filter((j) => j.status === 'SUBMITTED_FOR_VERIFICATION').length || null },
    { id: 'report', label: 'Reports', icon: 'report' },
    { id: 'billing', label: 'Vendor Billing', icon: 'billing' },
    { id: 'employees', label: 'Employees', icon: 'employees' },
    { id: 'banks', label: 'Banks', icon: 'banks' },
  ]

  const UJJ_BILL_FIELDS = [
    ['branch', 'Branch'], ['customerId', 'Customer ID'], ['customerName', 'Customer Name'],
    ['opinionDate', 'Date of Opinion'], ['opinionFee', 'Opinion Fee (Rs.)'],
    ['additionalFee', 'Additional Fee'], ['totalAmount', 'Total Amount'],
    ['jobCardPrefix', 'Job Card Prefix'], ['jobCardNo', 'Job Card No.'],
  ]
  const NIVARA_BILL_FIELDS = [
    ['branch', 'Branch'], ['applicantName', 'Applicant Name'], ['initiationDate', 'Date of Initiation'],
    ['propertyLocation', 'Property Location'], ['distanceFromBranch', 'Distance (km)'],
    ['stage', 'Stage (Fresh/2nd)'], ['amount', 'Amount (Rs.)'],
    ['jobCardPrefix', 'Job Card Prefix'], ['jobCardNo', 'Job Card No.'],
  ]
  const billFields = billingForm.bankCode === 'UJJ' ? UJJ_BILL_FIELDS : NIVARA_BILL_FIELDS

  const REPORT_FIELDS = [
    { section: 'Header Information', fields: [
      ['refNo', 'Reference Number'], ['reportDate', 'Report Date'], ['branchName', 'Branch Name'],
      ['caseType', 'Case Type (LAP/HL)'], ['valuerName', 'Valuer Name'], ['contactedPerson', 'Contacted Person & Mobile'],
    ]},
    { section: 'Applicant & Property', fields: [
      ['applicantName', 'Applicant Name'], ['ownerName', 'Owner Name'],
      ['propertyType', 'Property Type'], ['currentUsage', 'Current Usage'],
      ['siteAddress', 'Address as at Site'], ['documentAddress', 'Address as per Document'],
      ['landmark', 'Landmark'], ['distanceFromBranch', 'Distance from Branch (km)'],
    ]},
    { section: 'Occupancy & Identification', fields: [
      ['occupancy', 'Occupancy'], ['relationship', 'Relationship with Applicant'],
      ['identifiedThrough', 'Property Identified Through'],
    ]},
    { section: 'Area & Construction Details', fields: [
      ['plotArea', 'Plot / Land Area / UDS (sq ft)'], ['floors', 'Number of Floors'],
      ['rooms', 'Number of Rooms'], ['carpetArea', 'Carpet Area (sq ft)'],
      ['builtUpArea', 'Built-up Area (sq ft)'], ['propertyAge', 'Age of Property (years)'],
      ['residualLife', 'Residual Life (years)'], ['documentsVerified', 'Documents Verified'],
    ]},
    { section: 'Valuation', fields: [['totalValue', 'Total Valuation Amount (Rs.)']] },
    { section: 'Boundaries', fields: [
      ['northBoundary', 'North Boundary'], ['southBoundary', 'South Boundary'],
      ['eastBoundary', 'East Boundary'], ['westBoundary', 'West Boundary'],
      ['boundariesMatching', 'Boundaries Matching'], ['negativeArea', 'Negative Area'],
    ]},
    { section: 'Location & Observations', fields: [
      ['latitude', 'Latitude'], ['longitude', 'Longitude'],
      ['observation', 'Observation'], ['remarks', 'Additional Remarks'],
    ]},
  ]

  return (
    <div className={`admin-layout ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      {/* ─── Mobile Menu Toggle Bar (Visible only on mobile screens < 768px) ─── */}
      <div className="mobile-subbar">
        <button
          ref={mobileToggleRef}
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-sidebar"
          aria-label="Toggle navigation menu"
          className="mobile-menu-toggle-btn"
          onClick={() => setIsMobileMenuOpen((v) => !v)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ─── Backdrop Overlay for Mobile Drawer ─── */}
      {isMobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside id="admin-sidebar" ref={sidebarRef} className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', padding: isSidebarCollapsed ? '4px 0 10px' : '6px 12px 8px' }}>
          {!isSidebarCollapsed && <div className="sidebar-section-label" style={{ padding: 0 }}>Main Menu</div>}
          <button
            type="button"
            className="secondary-btn desktop-collapse-btn"
            style={{ padding: 6, borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', minWidth: 28 }}
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            type="button"
            className="secondary-btn mobile-close-btn"
            style={{ padding: 6, borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', minWidth: 28 }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {navItems.map(({ id, label, icon, badge }) => (
          <button
            key={id}
            type="button"
            className={`sidebar-nav-btn ${activeSection === id ? 'active-nav' : ''}`}
            onClick={() => {
              setActiveSection(id)
              setIsMobileMenuOpen(false)
            }}
            title={isSidebarCollapsed ? label : ''}
          >
            <span className="nav-icon"><Icon id={icon} /></span>
            {!isSidebarCollapsed && <span>{label}</span>}
            {!isSidebarCollapsed && badge ? <span className="nav-badge">{badge}</span> : null}
            {isSidebarCollapsed && badge ? <span className="nav-badge-dot" title={`${badge} ${label}`} /> : null}
          </button>
        ))}
      </aside>

      {/* ─── Main Content ─── */}

      <main className="admin-main">
        {/* ─── Breadcrumbs & Screen Back Button Bar ─── */}
        <div className="breadcrumb-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: '#ffffff', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setActiveSection('overview')
                setEditingJobForm(null)
                setViewingBillJob(null)
                setViewingReportJob(null)
              }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', padding: 0, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              🏠 Dashboard
            </button>

            {activeSection !== 'overview' && (
              <>
                <span style={{ color: 'var(--gray-400)' }}>/</span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSection === 'lead-form') setActiveSection('leads')
                    else if (activeSection === 'task-form') setActiveSection('tasks')
                    else if (activeSection === 'vendor-bill-detail') { setViewingBillJob(null); setActiveSection('billing') }
                    else if (activeSection === 'report-detail') { setViewingReportJob(null); setActiveSection('report') }
                    else if (editingJobForm) setEditingJobForm(null)
                    else setActiveSection('overview')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: ['lead-form', 'task-form', 'vendor-bill-detail', 'report-detail'].includes(activeSection) || editingJobForm ? 'var(--primary-600)' : 'var(--gray-800)',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: ['lead-form', 'task-form', 'vendor-bill-detail', 'report-detail'].includes(activeSection) || editingJobForm ? 500 : 700
                  }}
                >
                  {SECTION_NAMES[activeSection] || activeSection}
                </button>
              </>
            )}

            {activeSection === 'lead-form' && (
              <>
                <span style={{ color: 'var(--gray-400)' }}>/</span>
                <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>
                  {editingLeadId ? 'Edit Lead' : 'Add New Lead'}
                </span>
              </>
            )}

            {activeSection === 'task-form' && (
              <>
                <span style={{ color: 'var(--gray-400)' }}>/</span>
                <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>Add New Task</span>
              </>
            )}

            {activeSection === 'vendor-bill-detail' && viewingBillJob && (
              <>
                <span style={{ color: 'var(--gray-400)' }}>/</span>
                <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>Vendor Bill ({viewingBillJob.customer})</span>
              </>
            )}

            {activeSection === 'report-detail' && viewingReportJob && (
              <>
                <span style={{ color: 'var(--gray-400)' }}>/</span>
                <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>Inspection Report ({viewingReportJob.customer})</span>
              </>
            )}

            {editingJobForm && (
              <>
                <span style={{ color: 'var(--gray-400)' }}>/</span>
                <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>Edit Inspection Form ({editingJobForm.customer})</span>
              </>
            )}
          </div>

          {/* Screen Back Button */}
          {activeSection !== 'overview' && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                if (activeSection === 'lead-form') setActiveSection('leads')
                else if (activeSection === 'task-form') setActiveSection('tasks')
                else if (activeSection === 'vendor-bill-detail') { setViewingBillJob(null); setActiveSection('billing') }
                else if (activeSection === 'report-detail') { setViewingReportJob(null); setActiveSection('report') }
                else if (editingJobForm) setEditingJobForm(null)
                else setActiveSection('overview')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: 6,
                cursor: 'pointer',
                background: 'var(--gray-100)',
                border: '1px solid var(--gray-300)',
                color: 'var(--gray-700)'
              }}
            >
              <ChevronLeft size={16} />
              {activeSection === 'lead-form' ? 'Back to Bank Leads' :
               activeSection === 'task-form' ? 'Back to All Tasks' :
               activeSection === 'vendor-bill-detail' ? 'Back to Vendor Billing' :
               activeSection === 'report-detail' ? 'Back to Technical Reports' :
               editingJobForm ? 'Back to Reports' : 'Back to Dashboard'}
            </button>
          )}
        </div>

        {message && (
          <div className={`notice notice-${message.type}`} style={{ marginBottom: 20 }}>
            {message.text}
            <button type="button" className="notice-close" onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        {/* ══ EDIT FULL INSPECTION FORM (ADMIN FULL ACCESS) ══ */}
        {editingJobForm && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1.5px solid var(--primary-300)', marginBottom: 24, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--gray-200)', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✏️ Edit Submitted Property Case Details — {editingJobForm.customer}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--gray-500)' }}>
                  Admin Full Access: Modify any inspection answers, photos, boundary measurements, land values, or remarks before exporting.
                </p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setEditingJobForm(null)}
                style={{ fontWeight: 600 }}
              >
                ✕ Close Form Editor
              </button>
            </div>
            <PropertyCaseForm
              job={editingJobForm}
              onSubmit={async (payload) => {
                try {
                  await onSubmitJob(editingJobForm.id, payload)
                  showMsg('Property inspection details updated successfully ✓')
                  setEditingJobForm(null)
                  onRefresh()
                } catch (err) {
                  showMsg(err.message, 'error')
                }
              }}
              onBack={() => setEditingJobForm(null)}
              onGenerateReport={onGenerateReport}
            />
          </div>
        )}

        {/* ══ OVERVIEW ══ */}
        {activeSection === 'overview' && (


          <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2>Operations Dashboard</h2>
                <p>Monitor all bank leads, field tasks, verifications and billing activity</p>
              </div>
              <DateRangeFilter
                startDate={overviewFromDate}
                endDate={overviewToDate}
                onStartDateChange={setOverviewFromDate}
                onEndDateChange={setOverviewToDate}
                onClear={() => { setOverviewFromDate(''); setOverviewToDate('') }}
              />
            </div>

            <div className="stats-grid">
              {[
                { label: 'Total Leads', value: leads.length, color: 'blue', icon: '📋' },
                { label: 'Active Tasks', value: jobs.filter((j) => !['VERIFIED','COMPLETED'].includes(j.status)).length, color: 'amber', icon: '🚗' },
                { label: 'Pending Verification', value: jobs.filter((j) => j.status === 'SUBMITTED_FOR_VERIFICATION').length, color: 'purple', icon: '🔍' },
                { label: 'Verified / Completed', value: jobs.filter((j) => ['VERIFIED','COMPLETED'].includes(j.status)).length, color: 'green', icon: '✅' },
                { label: 'Field Executives', value: fieldUsers.length, color: 'blue', icon: '👷' },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className={`stat-card ${color}`}>
                  <div className="stat-top">
                    <div className="stat-label">{label}</div>
                    <div className={`stat-icon ${color}`}>{icon}</div>
                  </div>
                  <span className="stat-value">{value}</span>
                </div>
              ))}
            </div>

            <div className="dashboard-recent-grid">
              {/* Recent Leads */}
              <div className="table-container">
                <div className="table-toolbar">
                  <strong style={{ fontWeight: 700 }}>Recent Leads</strong>
                  <button type="button" className="secondary-btn" onClick={() => setActiveSection('leads')} style={{ marginLeft: 'auto' }}>View All</button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr><th>Customer</th><th>Bank</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {leads.slice(0, 6).map((lead) => (
                        <tr key={lead.id || lead._id}>
                          <td><div className="td-primary">{lead.customer}</div><div className="td-secondary">{lead.branch}</div></td>
                          <td>{lead.bankCode}</td>
                          <td><span className={`badge ${STATUS_COLOR[lead.status] || 'badge-gray'}`}>{lead.status || 'NEW'}</span></td>
                        </tr>
                      ))}
                      {leads.length === 0 && <tr><td colSpan={3}><div className="table-empty"><div className="table-empty-icon">📋</div><p>No leads yet</p></div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Tasks */}
              <div className="table-container">
                <div className="table-toolbar">
                  <strong style={{ fontWeight: 700 }}>Recent Tasks</strong>
                  <button type="button" className="secondary-btn" onClick={() => setActiveSection('tasks')} style={{ marginLeft: 'auto' }}>View All</button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr><th>Customer</th><th>Executive</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {jobs.slice(0, 6).map((job) => (
                        <tr key={job.id}>
                          <td><div className="td-primary">{job.customer}</div><div className="td-secondary">{job.bank}</div></td>
                          <td>{job.assignedEmployee || '-'}</td>
                          <td><span className={`badge ${STATUS_COLOR[job.status] || 'badge-gray'}`}>{job.status?.replace(/_/g, ' ')}</span></td>
                        </tr>
                      ))}
                      {jobs.length === 0 && <tr><td colSpan={3}><div className="table-empty"><div className="table-empty-icon">✅</div><p>No tasks yet</p></div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ BANK LEADS ══ */}
        {activeSection === 'leads' && (
          <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2>Bank Leads Management</h2>
                <p>Record incoming leads from Ujjivan, Nivara, and other banks</p>
              </div>
              <div className="inline-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-success"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => { setEditingLeadId(''); setLeadForm(emptyLeadForm); setShowLeadModal(true) }}
                >
                  <Plus size={18} /> + Add New Lead
                </button>
                <button type="button" className="secondary-btn" onClick={() => handleExport('UJJ')}>Export Ujjivan Excel</button>
                <button type="button" className="secondary-btn" onClick={() => handleExport('NIVARA')}>Export Nivara Excel</button>
                <button type="button" className="btn btn-primary" onClick={() => handleExport('ALL')}>Master Report (All)</button>
              </div>
            </div>

        {/* ══ ADD / EDIT BANK LEAD PAGE ══ */}
        {activeSection === 'lead-form' && (
          <div className="card" style={{ maxWidth: 820, margin: '0 auto 30px', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid var(--gray-200)' }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--brand-50), #eff6ff)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand-600)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                  <FolderPlus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--brand-900)', fontSize: '1.15rem', fontWeight: 800 }}>
                    {editingLeadId ? '✏️ Edit Bank Lead Details' : '➕ Create New Bank Lead'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                    Enter customer contact, bank branch, and reference details below
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setActiveSection('leads')}
                style={{ fontWeight: 600 }}
              >
                ← Back to Bank Leads
              </button>
            </div>

            <div className="card-body" style={{ padding: 26 }}>
              <form onSubmit={handleLeadSubmit}>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-field">
                    <label className="form-label">Bank <span className="required">*</span></label>
                    <select className="form-select" value={leadForm.bankCode} onChange={(e) => setLeadForm((p) => ({ ...p, bankCode: e.target.value }))}>
                      <option value="UJJ">Ujjivan Small Finance Bank</option>
                      <option value="NIVARA">Nivara Home Finance Limited</option>
                      {bankTemplates.filter((t) => !['UJJ','NIVARA'].includes(t.code)).map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Customer Name <span className="required">*</span></label>
                    <input className="form-input" value={leadForm.customer} onChange={(e) => setLeadForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Full name" required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Customer Phone</label>
                    <input className="form-input" value={leadForm.customerPhone} onChange={(e) => setLeadForm((p) => ({ ...p, customerPhone: e.target.value }))} placeholder="Mobile number" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Branch</label>
                    <input className="form-input" value={leadForm.branch} onChange={(e) => setLeadForm((p) => ({ ...p, branch: e.target.value }))} placeholder="Bank branch" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Property Location</label>
                    <input className="form-input" value={leadForm.location} onChange={(e) => setLeadForm((p) => ({ ...p, location: e.target.value }))} placeholder="Property address" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Loan / Case Type</label>
                    <select className="form-select" value={leadForm.loanType} onChange={(e) => setLeadForm((p) => ({ ...p, loanType: e.target.value }))}>
                      <option value="LAP">LAP</option><option value="HL">Home Loan</option>
                      <option value="BL">Business Loan</option><option value="OD">Overdraft</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Bank Ref / App No.</label>
                    <input className="form-input" value={leadForm.bankRefNo} onChange={(e) => setLeadForm((p) => ({ ...p, bankRefNo: e.target.value }))} placeholder="Reference number" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Received Date</label>
                    <input className="form-input" value={leadForm.receivedDate} onChange={(e) => setLeadForm((p) => ({ ...p, receivedDate: e.target.value }))} placeholder="dd.mm.yyyy" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={leadForm.priority} onChange={(e) => setLeadForm((p) => ({ ...p, priority: e.target.value }))}>
                      <option value="Normal">Normal</option><option value="Urgent">Urgent</option><option value="High">High</option>
                    </select>
                  </div>
                  <div className="form-field full-width">
                    <label className="form-label">Notes / Remarks</label>
                    <textarea className="form-textarea" value={leadForm.notes} onChange={(e) => setLeadForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." rows={3} />
                  </div>
                </div>
                <div className="btn-group" style={{ justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                  <button
                    type="button"
                    className="btn btn-purple"
                    onClick={() => setLeadForm({
                      bankCode: 'UJJ',
                      customer: 'K. Madhusudhanan',
                      customerPhone: '9845123456',
                      branch: 'Hosur Branch',
                      location: 'Plot 24, Sri Kamatchi Nagar, Avalapalli, Hosur',
                      loanType: 'HL',
                      bankRefNo: `APP-${Math.floor(100000 + Math.random() * 900000)}`,
                      receivedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
                      priority: 'Normal',
                      notes: 'Sample lead for testing Excel reports & exports',
                      employeeId: '',
                    })}
                  >
                    ⚡ Fill Sample Lead Data
                  </button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveSection('leads')}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg">{editingLeadId ? '💾 Update Lead' : '💾 Save New Lead →'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

            {/* Leads Table */}
            <div className="table-container">
              <div className="table-toolbar">
                <input className="table-search" placeholder="Search by customer, phone, ref, branch..." value={leadSearchQuery} onChange={(e) => setLeadSearchQuery(e.target.value)} />
                <select className="table-filter" value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
                  <option value="ALL">All Banks</option><option value="UJJ">Ujjivan</option><option value="NIVARA">Nivara</option>
                </select>
                <select className="table-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Status</option><option value="NEW">New</option><option value="ASSIGNED">Assigned</option>
                </select>
                <DateRangeFilter
                  startDate={leadFromDate}
                  endDate={leadToDate}
                  onStartDateChange={setLeadFromDate}
                  onEndDateChange={setLeadToDate}
                  onClear={() => { setLeadFromDate(''); setLeadToDate('') }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{filteredLeads.length} leads</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Ref / Date</th><th>Bank / Branch</th><th>Customer</th><th>Phone</th>
                      <th>Location</th><th>Type / Priority</th><th>Executive</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr><td colSpan={9}><div className="table-empty"><div className="table-empty-icon">📋</div><p>No leads match your search</p></div></td></tr>
                    ) : filteredLeads.map((lead) => {
                      const leadId = lead.id || lead._id
                      return (
                        <tr key={leadId}>
                          <td><div className="td-primary">{lead.bankRefNo || '—'}</div><div className="td-secondary">{lead.receivedDate}</div></td>
                          <td><div className="td-primary">{lead.bankCode}</div><div className="td-secondary">{lead.branch}</div></td>
                          <td><div className="td-primary">{lead.customer}</div></td>
                          <td>{lead.customerPhone || '—'}</td>
                          <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.location || '—'}</td>
                          <td>
                            <div>{lead.loanType}</div>
                            <span className={`badge ${lead.priority === 'Urgent' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>{lead.priority}</span>
                          </td>
                          <td>{lead.assignedEmployee || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                          <td><span className={`badge ${STATUS_COLOR[lead.status] || 'badge-gray'}`}>{lead.status || 'NEW'}</span></td>
                          <td>
                            <div className="inline-actions">
                              <button type="button" className="secondary-btn" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => selectLeadForTask(leadId)}>+ Task</button>
                              <button type="button" className="secondary-btn" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => handleEditLead(lead)}>Edit</button>
                              <button type="button" className="secondary-btn danger-btn" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => handleDeleteLead(leadId)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add Task moved into All Tasks view */}

        {/* ══ ALL TASKS ══ */}
        {activeSection === 'tasks' && (
          <div>
            <div className="page-header">
              <h2>All Assigned Tasks</h2>
              <p>Monitor all field executive tasks and site visit progress</p>
            </div>

            {/* Filter Toolbar */}
            <div className="table-toolbar" style={{ marginBottom: 16, background: '#fff', padding: 14, borderRadius: 14, border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    className="form-input"
                    placeholder="🔍 Search customer, bank, executive, location..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                  />
                </div>
                <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={taskBankFilter} onChange={(e) => setTaskBankFilter(e.target.value)}>
                  <option value="ALL">All Banks</option>
                  <option value="UJJ">Ujjivan</option>
                  <option value="NIVARA">Nivara</option>
                </select>
                <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}>
                  <option value="ALL">All Status</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="VISIT_STARTED">Visit Started</option>
                  <option value="VISITED_SITE">Visited Site</option>
                  <option value="SUBMITTED_FOR_VERIFICATION">Submitted Review</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REVISION_REQUIRED">Needs Correction</option>
                </select>
                <select className="form-select" style={{ width: 'auto', minWidth: 170 }} value={taskEmployeeFilter} onChange={(e) => setTaskEmployeeFilter(e.target.value)}>
                  <option value="ALL">All Field Visitors</option>
                  {fieldUsers.map((emp) => (
                    <option key={emp.id || emp._id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
                <DateRangeFilter
                  startDate={taskFromDate}
                  endDate={taskToDate}
                  onStartDateChange={setTaskFromDate}
                  onEndDateChange={setTaskToDate}
                  onClear={() => { setTaskFromDate(''); setTaskToDate('') }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {filteredTasks.length} tasks
                </span>
              </div>
            </div>

            {/* Add Task CTA Header */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" className="btn btn-primary" onClick={() => setActiveSection('task-form')}>+ Add New Task</button>
                <div style={{ color: 'var(--gray-600)', fontWeight: 600 }}>Create and assign a new field inspection task</div>
              </div>
            </div>

        {/* ══ ADD / ASSIGN TASK PAGE ══ */}
        {activeSection === 'task-form' && (
          <div className="card" style={{ maxWidth: 850, margin: '0 auto 30px', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid var(--gray-200)' }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--amber-600)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#78350f', fontSize: '1.15rem', fontWeight: 800 }}>
                    📋 Add & Assign New Task
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#92400e' }}>
                    Create a task for field inspection and assign to a field visitor
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setActiveSection('tasks')}
                style={{ fontWeight: 600 }}
              >
                ← Back to All Tasks
              </button>
            </div>

            <div className="card-body" style={{ padding: 26 }}>
              <div style={{ marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontWeight: 700, color: 'var(--brand-800)' }}>⚡ Quick fill from existing Bank Lead</label>
                <select className="form-select" value={selectedLeadForTask} onChange={(e) => selectLeadForTask(e.target.value)}>
                  <option value="">— Select a lead to auto-fill customer details —</option>
                  {leads.map((lead) => {
                    const lid = lead.id || lead._id
                    return <option key={lid} value={lid}>{lead.customer} — {lead.bankCode} — {lead.branch}</option>
                  })}
                </select>
              </div>

              <form onSubmit={handleTaskSubmit}>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-field">
                    <label className="form-label">Bank <span className="required">*</span></label>
                    <select className="form-select" value={taskForm.bankCode} onChange={(e) => setTaskForm((p) => ({ ...p, bankCode: e.target.value }))}>
                      <option value="UJJ">Ujjivan Small Finance Bank</option>
                      <option value="NIVARA">Nivara Home Finance Limited</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Customer Name <span className="required">*</span></label>
                    <input className="form-input" value={taskForm.customer} onChange={(e) => setTaskForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Customer full name" required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Customer Phone</label>
                    <input className="form-input" value={taskForm.customerPhone} onChange={(e) => setTaskForm((p) => ({ ...p, customerPhone: e.target.value }))} placeholder="Mobile number" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Branch</label>
                    <input className="form-input" value={taskForm.branch} onChange={(e) => setTaskForm((p) => ({ ...p, branch: e.target.value }))} placeholder="Bank branch" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Property Location</label>
                    <input className="form-input" value={taskForm.location} onChange={(e) => setTaskForm((p) => ({ ...p, location: e.target.value }))} placeholder="Property address" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Loan / Case Type</label>
                    <select className="form-select" value={taskForm.loanType} onChange={(e) => setTaskForm((p) => ({ ...p, loanType: e.target.value }))}>
                      <option value="LAP">LAP</option><option value="HL">Home Loan</option>
                      <option value="BL">Business Loan</option><option value="OD">Overdraft</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} placeholder="dd.mm.yyyy" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Assign To Field Executive <span className="required">*</span></label>
                    <select className="form-select" value={taskForm.employeeId} onChange={(e) => setTaskForm((p) => ({ ...p, employeeId: e.target.value }))}>
                      <option value="">— Select Executive —</option>
                      {fieldUsers.map((emp) => <option key={emp.id || emp._id} value={emp.id || emp._id}>{emp.name} ({emp.email})</option>)}
                    </select>
                  </div>
                  <div className="form-field full-width">
                    <label className="form-label">Task Notes / Instructions</label>
                    <textarea className="form-textarea" value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Special instructions, bank reference, remarks..." rows={3} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                  <button type="button" className="secondary-btn" onClick={() => setActiveSection('tasks')}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submittingTask}>{submittingTask ? 'Processing...' : '🚀 Create & Assign Task →'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

            <div className="jobs-grid">
              {filteredTasks.length === 0 ? (
                <div className="table-empty" style={{ gridColumn: '1/-1', background: '#fff', borderRadius: 16, padding: 40, border: '1px solid var(--gray-200)' }}>
                  <div className="table-empty-icon">📋</div><p>No tasks match your search filters</p>
                </div>
              ) : filteredTasks.map((job) => (
                <div key={job.id} className="job-card">
                  <div className="job-card-header">
                    <div>
                      <div className="job-card-id">Task #{job.id?.slice(-8)}</div>
                      <div className="job-card-customer">{job.customer}</div>
                    </div>
                    <span className={`badge ${STATUS_COLOR[job.status] || 'badge-gray'}`}>{job.status?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="job-card-bank">{job.bank} · {job.branch}</div>
                  <div className="job-card-meta">
                    <div className="job-meta-item"><strong>Executive:</strong> {job.assignedEmployee || '—'}</div>
                    <div className="job-meta-item"><strong>Location:</strong> {job.location || '—'}</div>
                    {job.statusNote && <div className="job-meta-item" style={{ gridColumn: '1/-1' }}><strong>Note:</strong> {job.statusNote}</div>}
                    {job.sitePhotos?.length > 0 && <div className="job-meta-item" style={{ color: 'var(--green-600)', fontWeight: 600 }}>📷 {job.sitePhotos.length} photo(s)</div>}
                  </div>
                  <div className="job-card-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditingJobForm(job); window.scrollTo({ top: 120, behavior: 'smooth' }) }}>✏️ View & Edit Form</button>
                    <button type="button" className="secondary-btn" onClick={() => fillFromJob(job)}>Use for Report</button>
                    <button type="button" className="secondary-btn danger-btn" onClick={async () => { if (window.confirm('Delete this task?')) { await onDeleteJob(job.id); showMsg('Task deleted') } }}>Delete</button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ VERIFY ══ */}
        {activeSection === 'verify' && (
          <div>
            <div className="page-header">
              <h2>Verify Submitted Work</h2>
              <p>Review field executive site visit details, photos, and verify completed work</p>
            </div>

            {/* Verify Work Filter Toolbar */}
            <div className="table-toolbar" style={{ marginBottom: 16, background: '#fff', padding: 14, borderRadius: 14, border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder="🔍 Search submitted work by customer, executive, site..."
                  value={verifySearchQuery}
                  onChange={(e) => setVerifySearchQuery(e.target.value)}
                />
                <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={verifyStatusFilter} onChange={(e) => setVerifyStatusFilter(e.target.value)}>
                  <option value="ALL">All Submissions</option>
                  <option value="SUBMITTED_FOR_VERIFICATION">Pending Review</option>
                  <option value="REVISION_REQUIRED">Needs Correction</option>
                  <option value="VERIFIED">Verified</option>
                </select>
                <DateRangeFilter
                  startDate={verifyFromDate}
                  endDate={verifyToDate}
                  onStartDateChange={setVerifyFromDate}
                  onEndDateChange={setVerifyToDate}
                  onClear={() => { setVerifyFromDate(''); setVerifyToDate('') }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {filteredVerifyJobs.length} submissions
                </span>
              </div>
            </div>

            {filteredVerifyJobs.length === 0 ? (
              <div style={{ background: '#fff', padding: 60, textAlign: 'center', borderRadius: 16, border: '1px solid var(--gray-200)', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
                <p>No submissions match your search filters</p>
              </div>
            ) : (
              <div className="jobs-grid">
                {filteredVerifyJobs.map((job) => (
                  <div key={`verify-${job.id}`} className="job-card" style={{ borderTop: job.status === 'SUBMITTED_FOR_VERIFICATION' ? '3px solid var(--amber-500)' : job.status === 'VERIFIED' ? '3px solid var(--green-500)' : '3px solid var(--red-500)' }}>
                    <div className="job-card-header">
                      <div>
                        <div className="job-card-id">#{job.id?.slice(-8)}</div>
                        <div className="job-card-customer">{job.customer}</div>
                      </div>
                      <span className={`badge ${STATUS_COLOR[job.status] || 'badge-gray'}`}>{job.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="job-card-bank">{job.bank} · {job.branch}</div>

                    <div style={{ fontSize: '0.86rem', color: 'var(--gray-600)', marginTop: 8 }}>
                      <div><strong>Executive:</strong> {job.assignedEmployee}</div>
                      <div><strong>Site:</strong> {job.visitDetails?.siteAddress || job.location || '—'}</div>
                      <div><strong>Valuation:</strong> Rs. {job.visitDetails?.totalValue || '—'}</div>
                      {job.visitDetails?.observation && <div><strong>Observation:</strong> {job.visitDetails.observation}</div>}
                    </div>

                    {job.sitePhotos?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Submitted Property Photos</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {job.sitePhotos.map((photo, idx) => (
                            <a key={idx} href={mediaUrl(photo.url)} target="_blank" rel="noopener noreferrer">
                              <img src={mediaUrl(photo.url)} alt={photo.name} onError={handleImageError} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--gray-200)' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <input className="form-input" placeholder="Verification remarks (optional)..." value={verifyRemarks[job.id] || ''} onChange={(e) => setVerifyRemarks((p) => ({ ...p, [job.id]: e.target.value }))} style={{ marginBottom: 10 }} />
                      <div className="btn-group">
                        <button type="button" className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setEditingJobForm(job); window.scrollTo({ top: 120, behavior: 'smooth' }) }}>✏️ View & Edit Form</button>
                        <button type="button" className="btn btn-success btn-sm" onClick={() => handleVerify(job.id, true)}>✓ Verify</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleVerify(job.id, false)}>↩ Needs Correction</button>
                        <button type="button" className="secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => fillFromJob(job)}>Use for Report</button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ REPORT GENERATION ══ */}
        {activeSection === 'report' && (
          <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2>Submitted Technical Reports ({jobs.filter((j) => j.status === 'SUBMITTED_FOR_VERIFICATION' || j.status === 'VERIFIED').length})</h2>
                <p>View property inspection reports submitted by field executives and export in bank Excel/PDF format</p>
              </div>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['ALL', 'All Banks'], ['UJJ', 'Ujjivan SFB'], ['NIVARA', 'Nivara HF']].map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={`task-tab ${bankFilter === code ? 'active' : ''}`}
                    onClick={() => setBankFilter(code)}
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submitted Reports Grid / Table */}
            <div className="jobs-grid">
              {jobs
                .filter((j) => {
                  const isSubmitted = j.status === 'SUBMITTED_FOR_VERIFICATION' || j.status === 'VERIFIED' || (j.sitePhotos && j.sitePhotos.length > 0)
                  if (!isSubmitted) return false
                  if (bankFilter !== 'ALL' && (j.bankCode || '').toUpperCase() !== bankFilter) return false
                  return true
                })
                .length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
                  <p style={{ fontWeight: 600 }}>No submitted property technical reports found</p>
                  <p style={{ fontSize: '0.85rem', marginTop: 4 }}>When field employees submit property verification forms from their login, they will appear here ready for export.</p>
                </div>
              ) : (
                jobs
                  .filter((j) => {
                    const isSubmitted = j.status === 'SUBMITTED_FOR_VERIFICATION' || j.status === 'VERIFIED' || (j.sitePhotos && j.sitePhotos.length > 0)
                    if (!isSubmitted) return false
                    if (bankFilter !== 'ALL' && (j.bankCode || '').toUpperCase() !== bankFilter) return false
                    return true
                  })
                  .map((job) => {
                    const photoCount = job.sitePhotos?.length || 0
                    const totalVal = job.visitDetails?.totalPropertyValue || job.visitDetails?.presentMarketValue || job.visitDetails?.totalValue
                    return (
                      <div key={job.id} className="job-card" style={{ border: '1.5px solid var(--gray-200)' }}>
                        <div className="job-card-header">
                          <div>
                            <div className="job-card-id">{job.bank || job.bankCode} · {job.branch || 'Branch'}</div>
                            <div className="job-card-customer">{job.customer}</div>
                          </div>
                          <span className={`badge ${job.status === 'VERIFIED' ? 'badge-green' : 'badge-blue'}`}>
                            {job.status?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="job-card-meta" style={{ marginTop: 10, marginBottom: 14 }}>
                          <div className="job-meta-item">Field Exec: <strong>{job.assignedEmployee || 'Assigned User'}</strong></div>
                          <div className="job-meta-item">Visited: <strong>{job.visitedAt ? new Date(job.visitedAt).toLocaleDateString() : 'Yes'}</strong></div>
                          <div className="job-meta-item">Valuation: <strong style={{ color: 'var(--green-700)' }}>{totalVal ? '₹' + Number(totalVal).toLocaleString('en-IN') : '—'}</strong></div>
                          <div className="job-meta-item">Photos: <strong>📷 {photoCount} photos</strong></div>
                        </div>

                        {job.sitePhotos?.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
                            {job.sitePhotos.slice(0, 4).map((photo, pIdx) => (
                              <img key={pIdx} src={mediaUrl(photo.url)} alt={photo.name} onError={handleImageError} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                            ))}
                            {job.sitePhotos.length > 4 && (
                              <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--gray-100)', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)' }}>
                                +{job.sitePhotos.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="job-card-actions">
                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            onClick={() => { setViewingReportJob(job); setIsEditingReportModal(false) }}
                          >
                            👁️ View Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onGenerateReport(job.id, { applicantName: job.customer, branchName: job.branch, caseRefNo: job.id, sitePhotos: job.sitePhotos || [] })}
                          >
                            📊 Export Excel Report
                          </button>
                          <button
                            type="button"
                            className="secondary-btn danger-btn btn-sm"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete technical report for "${job.customer}"?`)) {
                                try {
                                  await onDeleteJob(job.id)
                                  showMsg('Technical report deleted successfully!')
                                } catch (err) {
                                  showMsg(err.message, 'error')
                                }
                              }
                            }}
                          >
                            🗑️ Delete Report
                          </button>
                        </div>

                      </div>
                    )
                  })
              )}
            </div>
          </div>
        )}

        {/* ══ REPORT VIEW PAGE ══ */}
        {activeSection === 'report-detail' && viewingReportJob && (
          <div
            className="card"
            style={{ width: '100%', maxWidth: 860, margin: '0 auto 30px', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
          >
            {/* ── Page Header ── */}
            <div style={{ background: 'linear-gradient(135deg, #eef2ff, #f0fdf4)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>📋</div>
                <div>
                  <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '1.15rem', fontWeight: 800 }}>
                    👁️ View Technical Inspection Report
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#4338ca', fontWeight: 600, marginTop: 2 }}>
                    {viewingReportJob.customer} · {viewingReportJob.bank || viewingReportJob.bankCode} · {viewingReportJob.branch}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => { setViewingReportJob(null); setIsEditingReportModal(false); setEditingJobForm(viewingReportJob); window.scrollTo({ top: 120, behavior: 'smooth' }) }}
                >
                  ✏️ Edit Full Inspection Form
                </button>
                <button
                  type="button"
                  className="secondary-btn danger-btn"
                  style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete technical report for "${viewingReportJob.customer}"?`)) {
                      try {
                        await onDeleteJob(viewingReportJob.id)
                        showMsg('Technical report deleted successfully!')
                        setViewingReportJob(null)
                        setIsEditingReportModal(false)
                        setActiveSection('report')
                      } catch (err) {
                        showMsg(err.message, 'error')
                      }
                    }
                  }}
                >
                  🗑️ Delete Report
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => { setViewingReportJob(null); setIsEditingReportModal(false); setActiveSection('report') }}
                >
                  ← Back to Reports
                </button>
              </div>
            </div>

            {/* ── Page Body ── */}
            <div style={{ padding: 24, display: 'grid', gap: 20 }}>
              {/* Status & Assignment Row */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span className={`badge ${viewingReportJob.status === 'VERIFIED' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.82rem' }}>
                  {viewingReportJob.status?.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>👷 Executive: <strong>{viewingReportJob.assignedEmployee || '—'}</strong></span>
                {viewingReportJob.visitedAt && (
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>🗓️ Visited: <strong>{new Date(viewingReportJob.visitedAt).toLocaleDateString('en-IN')}</strong></span>
                )}
                {viewingReportJob.sitePhotos?.length > 0 && (
                  <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>📷 {viewingReportJob.sitePhotos.length} Photos Attached</span>
                )}
              </div>

              {/* ── SECTION RENDERER ── */}
              {(() => {
                const v = viewingReportJob.visitDetails || {}
                const sectionStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
                const headerStyle = { background: 'linear-gradient(90deg, #f0f9ff, #e0f2fe)', padding: '10px 16px', fontWeight: 800, fontSize: '0.82rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #bae6fd' }
                const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#e5e7eb' }
                const cellStyle = { background: '#fff', padding: '10px 14px' }
                const labelStyle = { fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }
                const valStyle = { fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }
                const dash = <span style={{ color: '#cbd5e1' }}>—</span>

                const Field = ({ label, value, full }) => (
                  <div style={{ ...cellStyle, gridColumn: full ? '1 / -1' : 'auto' }}>
                    <div style={labelStyle}>{label}</div>
                    <div style={valStyle}>{value !== undefined && value !== null && value !== '' ? String(value) : dash}</div>
                  </div>
                )

                return (
                  <>
                    {/* 1. Case & Reference */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>📑 Case & Reference Information</div>
                      <div style={gridStyle}>
                        <Field label="Reference No" value={v.refNo || v.caseRefNo} />
                        <Field label="Report Date" value={v.reportDate || v.dateOfInspection} />
                        <Field label="Case Type" value={v.caseType || v.purposeOfValuation} />
                        <Field label="Branch Name" value={v.branchName} />
                        <Field label="Valuer Name" value={v.valuerName} />
                        <Field label="Contacted Person" value={v.contactedPerson || v.contactPersonMobile} />
                      </div>
                    </div>

                    {/* 2. Applicant */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>👤 Applicant & Owner Details</div>
                      <div style={gridStyle}>
                        <Field label="Applicant Name" value={v.applicantName || viewingReportJob.customer} />
                        <Field label="Co-Applicant" value={v.coApplicantName} />
                        <Field label="Owner Name" value={v.ownerName || v.propertyOwnerName} />
                        <Field label="Relationship with Applicant" value={v.relationshipWithApplicant || v.relationship} />
                        <Field label="Customer ID" value={v.customerId || v.clientId} />
                        <Field label="Applicant Contact" value={v.applicantContact} />
                      </div>
                    </div>

                    {/* 3. Property Details */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>🏠 Property Details</div>
                      <div style={gridStyle}>
                        <Field label="Property Type" value={v.propertyType} />
                        <Field label="Property Sub-Type" value={v.propertySubType} />
                        <Field label="Current Usage" value={v.currentUsage} />
                        <Field label="Permitted Usage" value={v.permittedUsage || v.approvedUsage} />
                        <Field label="Survey Number" value={v.surveyNumber || v.newSurveyNumber} />
                        <Field label="Plot / Door Number" value={v.plotNumber || v.doorNumber || v.propertyNumber} />
                        <Field label="Village / Panchayat" value={v.village || v.panchayat} />
                        <Field label="Taluk" value={v.taluk} />
                        <Field label="District" value={v.district} />
                        <Field label="State" value={v.state} />
                        <Field label="Pincode" value={v.pincode} />
                        <Field label="Zonal Classification" value={v.zonalClassification} />
                        <Field label="Site Address" value={v.siteAddress} full />
                        <Field label="Document Address" value={v.documentAddress} full />
                        <Field label="Landmark" value={v.nearestLandmark || v.landmark} full />
                      </div>
                    </div>

                    {/* 4. Location & Access */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>📍 Location & Access</div>
                      <div style={gridStyle}>
                        <Field label="Distance from Branch (km)" value={v.distanceFromBranch} />
                        <Field label="Distance from City" value={v.distanceFromCity} />
                        <Field label="Approach Road" value={v.approachRoadWidth || v.roadWidth} />
                        <Field label="Road Condition" value={v.approachRoadCondition} />
                        <Field label="Nearest Bus Stop" value={v.busStop} />
                        <Field label="Railway Station" value={v.railwayStation} />
                        <Field label="Class of Locality" value={v.classOfLocality} />
                        <Field label="Marketability" value={v.marketability} />
                        <Field label="Nearby Amenities" value={v.nearbyAmenities} full />
                        <Field label="Latitude" value={v.latitude} />
                        <Field label="Longitude" value={v.longitude} />
                      </div>
                    </div>

                    {/* 5. Area & Construction */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>📐 Area & Construction Details</div>
                      <div style={gridStyle}>
                        <Field label="Plot / Land Area" value={v.plotArea || v.siteAreaActual} />
                        <Field label="UDS Area" value={v.udsArea} />
                        <Field label="Carpet Area (sq ft)" value={v.carpetArea} />
                        <Field label="Built-up Area (sq ft)" value={v.builtUpArea || v.actualBUA} />
                        <Field label="Number of Floors" value={v.numberOfFloorsAsBuilt || v.floors} />
                        <Field label="Number of Rooms" value={v.numberOfRooms || v.rooms} />
                        <Field label="Type of Structure" value={v.typeOfStructure} />
                        <Field label="Construction Type" value={v.typeOfConstruction} />
                        <Field label="Roof" value={v.roof} />
                        <Field label="Flooring" value={v.flooring} />
                        <Field label="Year of Construction" value={v.yearOfConstruction} />
                        <Field label="Age of Property (yrs)" value={v.ageOfProperty || v.propertyAge} />
                        <Field label="Residual Life (yrs)" value={v.residualLife} />
                        <Field label="Construction Quality" value={v.constructionQuality} />
                        <Field label="Construction Stage" value={v.constructionStage} />
                        <Field label="Plot Shape" value={v.plotShape} />
                      </div>
                    </div>

                    {/* 6. Occupancy */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>🏡 Occupancy & Identification</div>
                      <div style={gridStyle}>
                        <Field label="Present Occupancy" value={v.presentOccupancy || v.occupancy} />
                        <Field label="Occupant Name" value={v.occupantName} />
                        <Field label="Occupant Relationship" value={v.occupantRelationship} />
                        <Field label="Property Identified Through" value={v.identificationMethod || v.identifiedThrough} />
                      </div>
                    </div>

                    {/* 7. Boundaries */}
                    <div style={sectionStyle}>
                      <div style={{ ...headerStyle, background: 'linear-gradient(90deg, #fefce8, #fef9c3)', color: '#854d0e', borderBottom: '1px solid #fde68a' }}>📍 Boundary Details</div>
                      <div style={gridStyle}>
                        <Field label="North (as per Document)" value={v.northBoundaryDoc} />
                        <Field label="North (as at Site)" value={v.northBoundarySite} />
                        <Field label="South (as per Document)" value={v.southBoundaryDoc} />
                        <Field label="South (as at Site)" value={v.southBoundarySite} />
                        <Field label="East (as per Document)" value={v.eastBoundaryDoc} />
                        <Field label="East (as at Site)" value={v.eastBoundarySite} />
                        <Field label="West (as per Document)" value={v.westBoundaryDoc} />
                        <Field label="West (as at Site)" value={v.westBoundarySite} />
                        <Field label="Boundaries Matching" value={v.boundariesMatching === true || v.boundariesMatching === 'Yes' ? '✅ Yes' : v.boundariesMatching === false || v.boundariesMatching === 'No' ? '❌ No' : v.boundariesMatching} />
                        <Field label="Boundary Remarks" value={v.boundaryDifferenceRemarks} />
                      </div>
                    </div>

                    {/* 8. Approvals */}
                    <div style={sectionStyle}>
                      <div style={headerStyle}>📜 Approvals & Documents</div>
                      <div style={gridStyle}>
                        <Field label="Building Approval" value={v.buildingApprovalAvailable ? `✅ Available (${v.buildingApprovalNumber || ''})` : '❌ Not Available'} />
                        <Field label="DTCP Approval" value={v.dtcpApproval} />
                        <Field label="HNTDA Approval" value={v.hntdaApproval} />
                        <Field label="RERA" value={v.rera} />
                        <Field label="Sanction Plan Verified" value={v.sanctionPlanVerified ? '✅ Yes' : '❌ No'} />
                        <Field label="Construction as per Plan" value={v.constructionAsPerPlan ? '✅ Yes' : (v.deviationFromPlan ? '❌ Deviations found' : '—')} />
                        <Field label="Ownership Type" value={v.ownershipType} />
                        <Field label="Documents Verified" value={v.documentsVerified ? '✅ Verified' : (v.documentsVerified === false ? '❌ Not Verified' : v.documentsVerified)} />
                        <Field label="FSR Permitted" value={v.fsrPermitted} />
                        <Field label="FSR Actual" value={v.fsrActual} />
                      </div>
                    </div>

                    {/* 9. Valuation */}
                    <div style={{ ...sectionStyle, border: '1.5px solid #bbf7d0' }}>
                      <div style={{ ...headerStyle, background: 'linear-gradient(90deg, #f0fdf4, #dcfce7)', color: '#166534', borderBottom: '1px solid #86efac' }}>💰 Valuation Details</div>
                      <div style={gridStyle}>
                        <Field label="Present Market Rate" value={v.presentMarketRate ? `₹${Number(v.presentMarketRate).toLocaleString('en-IN')}/sq.ft` : undefined} />
                        <Field label="Guideline Value" value={v.guidelineValue ? `₹${Number(v.guidelineValue).toLocaleString('en-IN')}/sq.ft` : undefined} />
                        <Field label="Land Value" value={v.landValue ? `₹${Number(v.landValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Net Construction Value" value={v.netConstructionValue ? `₹${Number(v.netConstructionValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Depreciation %" value={v.depreciationPercent} />
                        <Field label="Amenities Value" value={v.amenitiesValue ? `₹${Number(v.amenitiesValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Total Property Value" value={v.totalPropertyValue || v.totalValue ? `₹${Number(v.totalPropertyValue || v.totalValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Present Market Value" value={v.presentMarketValue ? `₹${Number(v.presentMarketValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Realizable Value" value={v.realizableValue ? `₹${Number(v.realizableValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Forced Sale Value" value={v.forcedSaleValue ? `₹${Number(v.forcedSaleValue).toLocaleString('en-IN')}` : undefined} />
                        <Field label="Value in Words" value={v.valueInWords} full />
                      </div>
                    </div>

                    {/* 10. Observations */}
                    {(v.observation || v.remarks) && (
                      <div style={sectionStyle}>
                        <div style={headerStyle}>📝 Observations & Remarks</div>
                        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                          {v.observation && (
                            <div>
                              <div style={labelStyle}>Observation</div>
                              <div style={{ ...valStyle, fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.6, color: '#374151' }}>{v.observation}</div>
                            </div>
                          )}
                          {v.remarks && (
                            <div>
                              <div style={labelStyle}>Remarks</div>
                              <div style={{ ...valStyle, fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.6, color: '#374151' }}>{v.remarks}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 11. Site Photos */}
                    {viewingReportJob.sitePhotos?.length > 0 && (
                      <div style={sectionStyle}>
                        <div style={headerStyle}>📷 Site Photos ({viewingReportJob.sitePhotos.length})</div>
                        <div style={{ padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {viewingReportJob.sitePhotos.map((photo, pIdx) => (
                            <a key={pIdx} href={mediaUrl(photo.url)} target="_blank" rel="noopener noreferrer">
                              <img
                                src={mediaUrl(photo.url)}
                                alt={photo.name || `Photo ${pIdx + 1}`}
                                onError={handleImageError}
                                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0', transition: 'transform 0.15s', cursor: 'pointer' }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.08)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Page Footer Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    setViewingReportJob(null)
                    setIsEditingReportModal(false)
                    setEditingJobForm(viewingReportJob)
                    window.scrollTo({ top: 120, behavior: 'smooth' })
                  }}
                >
                  ✏️ Edit Full Inspection Form
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => onGenerateReport(viewingReportJob.id, { applicantName: viewingReportJob.customer, branchName: viewingReportJob.branch, caseRefNo: viewingReportJob.id, sitePhotos: viewingReportJob.sitePhotos || [] })}
                >
                  📊 Export Excel Report
                </button>
                <button
                  type="button"
                  className="secondary-btn danger-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete technical report for "${viewingReportJob.customer}"?`)) {
                      try {
                        await onDeleteJob(viewingReportJob.id)
                        showMsg('Technical report deleted successfully!')
                        setViewingReportJob(null)
                        setIsEditingReportModal(false)
                        setActiveSection('report')
                      } catch (err) {
                        showMsg(err.message, 'error')
                      }
                    }
                  }}
                >
                  🗑️ Delete Report
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => { setViewingReportJob(null); setIsEditingReportModal(false); setActiveSection('report') }}
                >
                  ← Back to Reports
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ VENDOR BILLING ══ */}
        {activeSection === 'billing' && (
          <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2>Vendor Billing & Bank Reports</h2>
                <p>Consolidated vendor bills submitted by field executives for Ujjivan MLAP and Nivara formats</p>
              </div>
            </div>

            {/* Quick Export Cards */}
            <div className="billing-export-grid">
              <div className="card billing-export-card" style={{ border: '2px solid var(--brand-500)' }}>
                <div className="card-bank-tag" style={{ color: 'var(--brand-600)' }}>Ujjivan Small Finance Bank</div>
                <h3 className="card-bank-title">MLAP Vendor Bill (June-Bill Format)</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-full-mobile"
                  disabled={exportingBank === 'UJJ'}
                  onClick={async () => {
                    try {
                      setExportingBank('UJJ')
                      const ujjJobs = jobs.filter((j) => j.bankCode === 'UJJ' || (j.bank || '').toLowerCase().includes('ujjivan'))
                      const cases = ujjJobs.map((j) => ({
                        branch: j.branch || 'Branch',
                        customerId: j.vendorBillDetails?.customerId || j.id,
                        customerName: j.customer,
                        applicantName: j.customer,
                        opinionDate: j.vendorBillDetails?.opinionDate || new Date().toISOString().split('T')[0],
                        opinionFee: j.vendorBillDetails?.opinionFee || 1500,
                        additionalFee: j.vendorBillDetails?.additionalFee || 0,
                        totalAmount: j.vendorBillDetails?.totalAmount || 1500,
                        jobCardPrefix: j.vendorBillDetails?.jobCardPrefix || 'K',
                        jobCardNo: j.vendorBillDetails?.jobCardNo || '',
                      }))
                      await onGenerateBilling({ bankCode: 'UJJ', monthName: billingForm.monthName, year: billingForm.year, invoiceNo: billingForm.invoiceNo, cases })
                      showMsg('Ujjivan vendor bill exported')
                    } catch (err) {
                      showMsg(err.message, 'error')
                    } finally {
                      setExportingBank('')
                    }
                  }}
                >
                  {exportingBank === 'UJJ' ? 'Exporting...' : '📊 Export Ujjivan Vendor Bill Excel'}
                </button>
              </div>

              <div className="card billing-export-card" style={{ border: '2px solid var(--purple-500)' }}>
                <div className="card-bank-tag" style={{ color: 'var(--purple-600)' }}>Nivara Housing Finance</div>
                <h3 className="card-bank-title">Nivara Vendor Bill (Revised Jul Format)</h3>
                <button
                  type="button"
                  className="btn btn-purple btn-full-mobile"
                  disabled={exportingBank === 'NIVARA'}
                  onClick={async () => {
                    try {
                      setExportingBank('NIVARA')
                      const nivJobs = jobs.filter((j) => j.bankCode === 'NIVARA' || (j.bank || '').toLowerCase().includes('nivara'))
                      const cases = nivJobs.map((j) => ({
                        branch: j.branch || 'Branch',
                        applicantName: j.customer,
                        initiationDate: j.vendorBillDetails?.opinionDate || new Date().toISOString().split('T')[0],
                        propertyLocation: j.location || '',
                        distanceFromBranch: j.visitDetails?.distanceFromBranch || '0',
                        stage: j.status || 'Fresh',
                        amount: j.vendorBillDetails?.totalAmount || 1500,
                        jobCardPrefix: j.vendorBillDetails?.jobCardPrefix || 'K',
                        jobCardNo: j.vendorBillDetails?.jobCardNo || '',
                      }))
                      await onGenerateBilling({ bankCode: 'NIVARA', monthName: billingForm.monthName, year: billingForm.year, invoiceNo: billingForm.invoiceNo, cases })
                      showMsg('Nivara vendor bill exported')
                    } catch (err) {
                      showMsg(err.message, 'error')
                    } finally {
                      setExportingBank('')
                    }
                  }}
                >
                  {exportingBank === 'NIVARA' ? 'Exporting...' : '📊 Export Nivara Vendor Bill Excel'}
                </button>
              </div>
            </div>

            {/* Submitted Vendor Bills Table */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Submitted Employee Vendor Bills</h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--gray-500)', marginTop: 4 }}>
                    Live vendor bill details filled and submitted by field executives during site visits.
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '6px 14px', borderRadius: 999 }}>
                  {filteredBillingJobs.length} Cases Listed
                </span>
              </div>

              {/* Billing Filter Toolbar */}
              <div className="table-toolbar" style={{ padding: '12px 18px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: 1, minWidth: 220, background: '#fff' }}
                  placeholder="🔍 Search vendor bills by customer, job card, visitor, branch..."
                  value={billingSearchQuery}
                  onChange={(e) => setBillingSearchQuery(e.target.value)}
                />
                <select className="form-select" style={{ width: 'auto', minWidth: 140, background: '#fff' }} value={billingBankFilter} onChange={(e) => setBillingBankFilter(e.target.value)}>
                  <option value="ALL">All Banks</option>
                  <option value="UJJ">Ujjivan</option>
                  <option value="NIVARA">Nivara</option>
                </select>
                <select className="form-select" style={{ width: 'auto', minWidth: 160, background: '#fff' }} value={billingStatusFilter} onChange={(e) => setBillingStatusFilter(e.target.value)}>
                  <option value="ALL">All Submission States</option>
                  <option value="SUBMITTED">Submitted by Employee</option>
                  <option value="PENDING">Pending Submission</option>
                </select>
                <DateRangeFilter
                  startDate={billingFromDate}
                  endDate={billingToDate}
                  onStartDateChange={setBillingFromDate}
                  onEndDateChange={setBillingToDate}
                  onClear={() => { setBillingFromDate(''); setBillingToDate('') }}
                />
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Customer / Applicant</th>
                        <th>Bank / Branch</th>
                        <th>Field Executive (Visitor)</th>
                        <th>Opinion Date</th>
                        <th>Fee (Rs.)</th>
                        <th>Job Card</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBillingJobs.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                            No vendor bills match your search filters.
                          </td>
                        </tr>
                      ) : (
                        filteredBillingJobs.map((job, idx) => {
                          const b = job.vendorBillDetails || {}
                          const opinionFee = Number(b.opinionFee) || 1500
                          const additionalFee = Number(b.additionalFee) || 0
                          const fee = b.totalAmount !== undefined ? b.totalAmount : opinionFee + additionalFee
                          const isSubmitted = b.submitted || job.status === 'SUBMITTED_FOR_VERIFICATION' || job.status === 'VERIFIED'
                          return (
                            <tr key={job.id}>
                              <td style={{ color: 'var(--gray-400)' }}>{idx + 1}</td>
                              <td>
                                <strong style={{ color: 'var(--gray-900)' }}>{job.customer}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>ID: {b.customerId || job.customerAppNo || job.id?.slice(-6)}</div>
                              </td>
                              <td>
                                <div>{job.bank || job.bankCode}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{job.branch || 'Main Branch'}</div>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--brand-700)' }}>👷 {job.assignedEmployee || 'Executive'}</strong>
                              </td>
                              <td>{b.opinionDate || (job.visitedAt ? new Date(job.visitedAt).toLocaleDateString() : new Date().toLocaleDateString())}</td>
                              <td style={{ fontWeight: 800, color: 'var(--green-700)' }}>₹{Number(fee).toLocaleString('en-IN')}</td>
                              <td>
                                <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 6 }}>
                                  {b.jobCardPrefix || 'K'} - {b.jobCardNo || idx + 1}
                                </code>
                              </td>
                              <td>
                                <span className={`badge ${isSubmitted ? 'badge-green' : 'badge-amber'}`}>
                                  {isSubmitted ? '✓ Submitted' : '⏳ Ready for Export'}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                                  onClick={() => setViewingBillJob(job)}
                                >
                                  👁️ View & Edit Details
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* By Employee Summary */}
            {billingViewMode === 'byEmployee' && (
              <div>
                <div style={{ marginBottom: 16, padding: '14px 20px', background: '#fff', borderRadius: 12, border: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Grand Total ({billingPeriod})</strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-600)' }}>Rs. {billingSummary?.grandTotal?.toLocaleString() || '—'}</div>
                  </div>
                  <span className="badge badge-green">{billingSummary?.byEmployee?.reduce((a, e) => a + e.totalCases, 0) || 0} total cases</span>
                </div>
                <div className="billing-summary-grid">
                  {billingSummary?.byEmployee?.map((emp) => (
                    <div key={emp.employeeId} className="billing-emp-card">
                      <div className="billing-emp-name">{emp.employeeName}</div>
                      <div className="billing-emp-stats">
                        <div className="billing-emp-stat">
                          <div className="billing-emp-stat-value">{emp.totalCases}</div>
                          <div className="billing-emp-stat-label">Cases</div>
                        </div>
                        <div className="billing-emp-stat">
                          <div className="billing-emp-stat-value">₹{emp.totalBilling?.toLocaleString()}</div>
                          <div className="billing-emp-stat-label">Total Billing</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!billingSummary?.byEmployee?.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No billing data for selected period</div>}
                </div>
              </div>
            )}

            {/* By Bank Summary */}
            {billingViewMode === 'byBank' && (
              <div className="table-container">
                <div className="table-toolbar"><strong>Bank Branch Billing Summary</strong></div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr><th>Bank</th><th>Branch</th><th>Cases</th><th>Total Amount</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {billingSummary?.byBank?.map((item, idx) => (
                        <tr key={idx}>
                          <td><div className="td-primary">{item.bankName}</div></td>
                          <td>{item.branch}</td>
                          <td><span className="badge badge-blue">{item.totalCases}</span></td>
                          <td><strong style={{ color: 'var(--green-600)' }}>Rs. {item.totalBilling?.toLocaleString()}</strong></td>
                          <td><button type="button" className="secondary-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleExport(item.bankCode)}>Export</button></td>
                        </tr>
                      )) || []}
                      {!billingSummary?.byBank?.length && <tr><td colSpan={5}><div className="table-empty"><div className="table-empty-icon">💳</div><p>No billing data</p></div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ EMPLOYEES ══ */}
        {activeSection === 'employees' && (
          <div>
            <div className="page-header">
              <h2>Field Executives</h2>
              <p>Add and manage field executive accounts</p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3>Add New Field Executive</h3></div>
              <div className="card-body">
                <form onSubmit={handleEmployeeSubmit}>
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    {[['name', 'Full Name', 'text'], ['email', 'Email Address', 'email'], ['username', 'Username (login)', 'text'], ['phone', 'Phone Number', 'text']].map(([field, label, type]) => (
                      <div key={field} className="form-field">
                        <label className="form-label">{label}</label>
                        <input className="form-input" type={type} value={employeeForm[field]} onChange={(e) => setEmployeeForm((p) => ({ ...p, [field]: e.target.value }))} placeholder={label} />
                      </div>
                    ))}
                    <div className="form-field">
                      <label className="form-label">Password</label>
                      <div className="password-field">
                        <input className="form-input" type={showEmpPassword ? 'text' : 'password'} value={employeeForm.password} onChange={(e) => setEmployeeForm((p) => ({ ...p, password: e.target.value }))} placeholder="Set login password" />
                        <button type="button" onClick={() => setShowEmpPassword((v) => !v)}>{showEmpPassword ? 'Hide' : 'Show'}</button>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Add Executive</button>
                </form>
              </div>
            </div>

            <div className="table-container">
              <div className="table-toolbar"><strong>{fieldUsers.length} Field Executives</strong></div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Phone</th><th>Active Tasks</th><th>Actions</th></tr></thead>
                  <tbody>
                    {fieldUsers.length === 0 ? (
                      <tr><td colSpan={6}><div className="table-empty"><div className="table-empty-icon">👷</div><p>No field executives added yet</p></div></td></tr>
                    ) : fieldUsers.map((emp) => {
                      const empId = emp.id || emp._id
                      const empJobs = jobs.filter((j) => j.assignedTo === empId)
                      return (
                        <tr key={empId}>
                          <td><div className="td-primary">{emp.name}</div></td>
                          <td>{emp.email}</td>
                          <td><code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 6, fontSize: '0.85rem' }}>{emp.username || emp.email}</code></td>
                          <td>{emp.phone || '—'}</td>
                          <td><span className="badge badge-blue">{empJobs.length} tasks</span></td>
                          <td>
                            <button type="button" className="secondary-btn danger-btn" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => handleDeleteEmployee(empId, emp.name)}>Delete</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ BANKS ══ */}
        {activeSection === 'banks' && (
          <div>
            <div className="page-header">
              <h2>Bank Template Management</h2>
              <p>Manage bank configurations, report templates, and billing formats</p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3>{editingBankId ? 'Edit Bank' : 'Add Bank'}</h3>
                {editingBankId && <button type="button" className="secondary-btn" onClick={() => { setEditingBankId(''); setBankForm({ name: '', code: '', branchName: '', address: '' }) }}>Cancel</button>}
              </div>
              <div className="card-body">
                <form onSubmit={handleBankSubmit}>
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-field">
                      <label className="form-label">Bank Name</label>
                      <select className="form-select" value={bankForm.name} onChange={(e) => {
                        const val = e.target.value
                        if (val === 'UJJ') setBankForm({ name: 'Ujjivan Small Finance Bank', code: 'UJJ', branchName: 'Suramangalam', address: 'No-30/3-2, Mullai Nagar, Salem Main Road, Suramangalam, Salem - 636005' })
                        else if (val === 'NIVARA') setBankForm({ name: 'Nivara Home Finance Limited', code: 'NIVARA', branchName: '', address: '' })
                        else setBankForm((p) => ({ ...p, name: val }))
                      }}>
                        <option value="">— Select or type bank name —</option>
                        <option value="UJJ">Ujjivan Small Finance Bank</option>
                        <option value="NIVARA">Nivara Home Finance Limited</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Bank Code</label>
                      <input className="form-input" value={bankForm.code} onChange={(e) => setBankForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. UJJ" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Branch Name</label>
                      <input className="form-input" value={bankForm.branchName} onChange={(e) => setBankForm((p) => ({ ...p, branchName: e.target.value }))} placeholder="Branch name" />
                    </div>
                    <div className="form-field full-width">
                      <label className="form-label">Address</label>
                      <input className="form-input" value={bankForm.address} onChange={(e) => setBankForm((p) => ({ ...p, address: e.target.value }))} placeholder="Bank address" />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">{editingBankId ? 'Update Bank' : 'Add Bank'}</button>
                </form>
              </div>
            </div>

            <div className="table-container">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Bank Name</th><th>Code</th><th>Branch</th><th>Report Template</th><th>Bill Template</th><th>Actions</th></tr></thead>
                  <tbody>
                    {bankTemplates.length === 0 ? (
                      <tr><td colSpan={6}><div className="table-empty"><div className="table-empty-icon">🏦</div><p>No banks configured yet</p></div></td></tr>
                    ) : bankTemplates.map((tpl) => {
                      const tId = tpl.id || tpl._id
                      return (
                        <tr key={tId || tpl.code}>
                          <td className="td-primary">{tpl.name}</td>
                          <td><span className="badge badge-blue">{tpl.code}</span></td>
                          <td>{tpl.branchName || '—'}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{tpl.reportTemplate || 'Default'}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{tpl.billingTemplate || 'Default'}</td>
                          <td>
                            {tId && (
                              <div className="inline-actions">
                                <button type="button" className="secondary-btn" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => { setEditingBankId(tId); setBankForm({ name: tpl.name || '', code: tpl.code || '', branchName: tpl.branchName || '', address: tpl.address || '' }) }}>Edit</button>
                                <button type="button" className="secondary-btn danger-btn" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={async () => { if (window.confirm('Delete?')) { try { await onDeleteBankTemplate(tId); showMsg('Bank deleted') } catch (err) { showMsg(err.message, 'error') } } }}>Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ VENDOR BILL DETAIL PAGE ══ */}
        {activeSection === 'vendor-bill-detail' && viewingBillJob && (
          <div
            className="card"
            style={{ width: '100%', maxWidth: 820, margin: '0 auto 30px', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
          >
            {/* Header with View / Edit Mode Toggle & Back Button */}
            <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--purple-50), #f3e8ff)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--purple-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--purple-600)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                  🧾
                </div>
                <div>
                  <h3 style={{ color: 'var(--purple-900)', margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800 }}>
                    Vendor Bill Details — {viewingBillJob.customer}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--purple-700)', fontWeight: 600, marginTop: 2 }}>
                    Field Visitor: <strong>👷 {viewingBillJob.assignedEmployee || 'Field Executive'}</strong> · {viewingBillJob.bank} ({viewingBillJob.branch || 'Main'})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className={`btn ${isEditingModal ? 'btn-primary' : 'secondary-btn'}`}
                  style={{ fontSize: '0.85rem', padding: '7px 14px' }}
                  onClick={() => setIsEditingModal((v) => !v)}
                >
                  {isEditingModal ? '👁️ View Mode' : '✏️ Edit Details'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => { setViewingBillJob(null); setActiveSection('billing') }}
                >
                  ← Back to Vendor Billing
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="card-body" style={{ padding: 26, display: 'grid', gap: 18 }}>
              {isEditingModal ? (
                /* ─── EDIT MODE ─── */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (savingBill) return
                    setSavingBill(true)
                    try {
                      const opinionFee = Number(editBillForm.opinionFee) || 0
                      const additionalFee = Number(editBillForm.additionalFee) || 0
                      const totalAmount = opinionFee + additionalFee
                      const payload = {
                        ...editBillForm,
                        opinionFee,
                        additionalFee,
                        totalAmount,
                        amount: opinionFee,
                        customerName: viewingBillJob.customer,
                        branch: viewingBillJob.branch,
                        bankCode: viewingBillJob.bankCode,
                        assignedEmployee: viewingBillJob.assignedEmployee,
                        submitted: true,
                      }

                      if (onSubmitVendorBill) {
                        await onSubmitVendorBill(viewingBillJob.id, payload)
                      } else {
                        viewingBillJob.vendorBillDetails = payload
                      }

                      showMsg('Vendor bill details updated successfully!')
                      setIsEditingModal(false)
                      onRefresh()
                    } catch (err) {
                      showMsg(err.message, 'error')
                    } finally {
                      setSavingBill(false)
                    }
                  }}
                  style={{ display: 'grid', gap: 16 }}
                >
                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Customer Name</label>
                      <input className="form-input" value={viewingBillJob.customer || ''} readOnly style={{ background: 'var(--gray-100)' }} />
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Bank & Branch</label>
                      <input className="form-input" value={`${viewingBillJob.bank} (${viewingBillJob.branch || 'Main'})`} readOnly style={{ background: 'var(--gray-100)' }} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Customer ID / App No</label>
                      <input
                        className="form-input"
                        value={editBillForm.customerId || ''}
                        onChange={(e) => setEditBillForm((p) => ({ ...p, customerId: e.target.value }))}
                        placeholder="Customer ID"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Date of Opinion / Visit</label>
                      <input
                        className="form-input"
                        type="date"
                        value={editBillForm.opinionDate || ''}
                        onChange={(e) => setEditBillForm((p) => ({ ...p, opinionDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Opinion Fee (Rs.)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={editBillForm.opinionFee || 0}
                        onChange={(e) => setEditBillForm((p) => ({ ...p, opinionFee: e.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Additional Fee (Rs.)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={editBillForm.additionalFee || 0}
                        onChange={(e) => setEditBillForm((p) => ({ ...p, additionalFee: e.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Total Amount (Rs.)</label>
                      <input
                        className="form-input"
                        value={`₹${(Number(editBillForm.opinionFee) || 0) + (Number(editBillForm.additionalFee) || 0)}`}
                        readOnly
                        style={{ background: 'var(--green-50)', fontWeight: 800, color: 'var(--green-700)' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Job Card Prefix</label>
                      <input
                        className="form-input"
                        value={editBillForm.jobCardPrefix || ''}
                        onChange={(e) => setEditBillForm((p) => ({ ...p, jobCardPrefix: e.target.value }))}
                        placeholder="Prefix e.g. K"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Job Card No.</label>
                      <input
                        className="form-input"
                        value={editBillForm.jobCardNo || ''}
                        onChange={(e) => setEditBillForm((p) => ({ ...p, jobCardNo: e.target.value }))}
                        placeholder="Job Card No."
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', fontWeight: 700 }}>Remarks / Special Notes</label>
                    <textarea
                      className="form-textarea"
                      value={editBillForm.remarks || ''}
                      onChange={(e) => setEditBillForm((p) => ({ ...p, remarks: e.target.value }))}
                      placeholder="Additional remarks..."
                      rows={3}
                    />
                  </div>

                  <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 10, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditingModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={savingBill}>{savingBill ? 'Saving...' : '💾 Save & Update Vendor Bill'}</button>
                  </div>
                </form>
              ) : (
                /* ─── VIEW MODE ─── */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--gray-50)', padding: 18, borderRadius: 14, border: '1px solid var(--gray-200)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Customer Name</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)' }}>{viewingBillJob.customer}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Bank & Branch</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>{viewingBillJob.bank} ({viewingBillJob.branch || 'Main'})</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Customer ID / App No</div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-800)', wordBreak: 'break-all' }}>{viewingBillJob.vendorBillDetails?.customerId || viewingBillJob.id}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Date of Opinion / Visit</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)' }}>{viewingBillJob.vendorBillDetails?.opinionDate || (viewingBillJob.visitedAt ? new Date(viewingBillJob.visitedAt).toLocaleDateString() : '—')}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, background: 'var(--green-50)', padding: 18, borderRadius: 14, border: '1.5px solid var(--green-200)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--green-800)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Opinion Fee</div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--green-700)' }}>₹{viewingBillJob.vendorBillDetails?.opinionFee || 1500}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--green-800)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Additional Fee</div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--green-700)' }}>₹{viewingBillJob.vendorBillDetails?.additionalFee || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--green-800)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Amount</div>
                      <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'var(--green-800)' }}>₹{viewingBillJob.vendorBillDetails?.totalAmount || 1500}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--gray-50)', padding: 18, borderRadius: 14, border: '1px solid var(--gray-200)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Job Card Prefix & No</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand-700)' }}>
                        {viewingBillJob.vendorBillDetails?.jobCardPrefix || 'K'} - {viewingBillJob.vendorBillDetails?.jobCardNo || '1'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Field Visitor / Executive</div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>👷 {viewingBillJob.assignedEmployee || 'Unassigned'}</div>
                    </div>
                  </div>

                  {viewingBillJob.vendorBillDetails?.remarks && (
                    <div style={{ background: 'var(--amber-50)', padding: 16, borderRadius: 12, border: '1px solid var(--amber-200)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--amber-800)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remarks / Special Notes</div>
                      <div style={{ fontSize: '0.92rem', color: 'var(--gray-800)', marginTop: 4, fontWeight: 500 }}>{viewingBillJob.vendorBillDetails.remarks}</div>
                    </div>
                  )}

                  <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 10, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                    <button type="button" className="btn btn-primary" onClick={() => setIsEditingModal(true)}>✏️ Edit Details</button>
                    <button type="button" className="btn btn-secondary" onClick={() => { setViewingBillJob(null); setActiveSection('billing') }}>← Back to Vendor Billing</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
