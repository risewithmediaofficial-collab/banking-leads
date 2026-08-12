import { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import FieldDashboard from './pages/FieldDashboard.jsx'
import {
  assignLead, createBankTemplate, createLead, createTask, createUser,
  deleteBankTemplate, deleteJob, deleteLead, deleteUser, exportLeads, generateBilling,
  generateReport, getBankTemplates, getBanks, getDashboard, getJobs,
  getLeads, getUsers, loginUser, submitJob, submitVendorBill, updateBankTemplate, updateJobStatus,
  updateLead, verifyJob,
} from './services/api.js'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [banks, setBanks] = useState([])
  const [leads, setLeads] = useState([])
  const [jobs, setJobs] = useState([])
  const [users, setUsers] = useState([])
  const [bankTemplates, setBankTemplates] = useState([])
  const [refreshFlag, setRefreshFlag] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      setLoading(true)
      try {
        const [dashboard, bankList, leadList, jobList, userList, templateList] = await Promise.all([
          getDashboard(),
          getBanks(),
          getLeads(),
          getJobs(),
          getUsers(),
          getBankTemplates(),
        ])
        setDashboardData(dashboard)
        setBanks(bankList)
        setLeads(leadList)
        setJobs(jobList)
        setUsers(userList)
        setBankTemplates(templateList)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [refreshFlag, user])

  const refresh = () => setRefreshFlag((v) => v + 1)

  const handleLogin = async (credentials) => {
    const result = await loginUser(credentials)
    setUser(result.user)
    refresh()
  }

  const handleLogout = () => {
    setUser(null)
    setDashboardData(null)
    setBanks([])
    setLeads([])
    setJobs([])
    setUsers([])
    setBankTemplates([])
  }

  const handleCreateLead = async (payload) => { await createLead(payload); refresh() }
  const handleUpdateLead = async (leadId, payload) => { await updateLead(leadId, payload); refresh() }
  const handleDeleteLead = async (leadId) => { await deleteLead(leadId); refresh() }

  const handleExportLeads = async (payload) => {
    const result = await exportLeads(payload)
    if (result.fileUrl) window.open(`http://localhost:3000${result.fileUrl}`, '_blank')
    return result
  }

  const handleAssignLead = async (leadId, employeeId, bankCode) => {
    await assignLead(leadId, employeeId, bankCode)
    refresh()
  }

  const handleCreateEmployee = async (payload) => { await createUser(payload); refresh() }
  const handleDeleteEmployee = async (userId) => { await deleteUser(userId); refresh() }
  const handleCreateBankTemplate = async (payload) => { await createBankTemplate(payload); refresh() }
  const handleUpdateBankTemplate = async (templateId, payload) => { await updateBankTemplate(templateId, payload); refresh() }
  const handleDeleteBankTemplate = async (templateId) => { await deleteBankTemplate(templateId); refresh() }
  const handleCreateTask = async (payload) => { await createTask(payload); refresh() }
  const handleSubmitJob = async (jobId, formData) => { await submitJob(jobId, formData); refresh() }
  const handleVerifyJob = async (jobId, payload) => { await verifyJob(jobId, payload); refresh() }
  const handleUpdateJobStatus = async (jobId, payload) => { await updateJobStatus(jobId, payload); refresh() }
  const handleDeleteJob = async (jobId) => { await deleteJob(jobId); refresh() }

  const handleGenerateReport = async (jobId, payload) => {
    const result = await generateReport(jobId, payload)
    if (result.fileUrl) window.open(`http://localhost:3000${result.fileUrl}`, '_blank')
    return result
  }

  const handleGenerateBilling = async (payload) => {
    const result = await generateBilling(payload)
    if (result.fileUrl) window.open(`http://localhost:3000${result.fileUrl}`, '_blank')
    return result
  }

  const handleSubmitVendorBill = async (jobId, payload) => { await submitVendorBill(jobId, payload); refresh() }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />
  }

  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const isAdmin = user.role === 'admin'

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="topbar-brand-text">Ramjayam Associates</div>
            <span className="topbar-brand-sub">Property Verification Platform</span>
          </div>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-user">
          <div className="topbar-user-info">
            <div className="topbar-user-name">{user.name}</div>
            <div className="topbar-user-role">{isAdmin ? 'Administrator' : 'Field Executive'}</div>
          </div>
          <div className="topbar-user-avatar">{initials}</div>
          <button type="button" className="topbar-logout-btn" onClick={handleLogout} title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <main id="main" role="main">
      {isAdmin ? (
        <AdminDashboard
          user={user}
          dashboardData={dashboardData}
          banks={banks}
          bankTemplates={bankTemplates}
          leads={leads}
          jobs={jobs}
          users={users}
          loading={loading}
          onRefresh={refresh}
          onCreateLead={handleCreateLead}
          onUpdateLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
          onExportLeads={handleExportLeads}
          onCreateBankTemplate={handleCreateBankTemplate}
          onUpdateBankTemplate={handleUpdateBankTemplate}
          onDeleteBankTemplate={handleDeleteBankTemplate}
          onCreateEmployee={handleCreateEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onCreateTask={handleCreateTask}
          onAssignLead={handleAssignLead}
          onDeleteJob={handleDeleteJob}
          onVerifyJob={handleVerifyJob}
          onGenerateReport={handleGenerateReport}
          onGenerateBilling={handleGenerateBilling}
          onSubmitVendorBill={handleSubmitVendorBill}
        />
      ) : (
        <FieldDashboard
          user={user}
          jobs={jobs.filter((job) => job.assignedTo === user.id)}
          bankTemplates={bankTemplates}
          onSubmit={handleSubmitJob}
          onSubmitVendorBill={handleSubmitVendorBill}
          onUpdateStatus={handleUpdateJobStatus}
          onGenerateReport={handleGenerateReport}
          onRefresh={refresh}
        />
      )}
    </main>
    </div>
  )
}

export default App
