const API_BASE = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export async function loginUser(credentials) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
}

export async function getDashboard() {
  return request('/dashboard')
}

export async function getBanks() {
  return request('/banks')
}

export async function getBankTemplates() {
  return request('/bank-templates')
}

export async function createBankTemplate(payload) {
  return request('/bank-templates', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateBankTemplate(templateId, payload) {
  return request(`/bank-templates/${templateId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteBankTemplate(templateId) {
  return request(`/bank-templates/${templateId}`, { method: 'DELETE' })
}

export async function getLeads() {
  return request('/leads')
}

export async function createLead(payload) {
  return request('/leads', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateLead(leadId, payload) {
  return request(`/leads/${leadId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteLead(leadId) {
  return request(`/leads/${leadId}`, { method: 'DELETE' })
}

export async function exportLeads(payload) {
  return request('/leads/export', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getJobs() {
  return request('/jobs')
}

export async function getUsers() {
  return request('/users')
}

export async function createUser(payload) {
  return request('/users', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteUser(userId) {
  return request(`/users/${userId}`, { method: 'DELETE' })
}


export async function createTask(payload) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(payload) })
}

export async function assignLead(leadId, employeeId, bankCode) {
  return request(`/leads/${leadId}/assign`, { method: 'POST', body: JSON.stringify({ employeeId, bankCode }) })
}

export async function submitJob(jobId, payload) {
  return request(`/jobs/${jobId}/submit`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function submitVendorBill(jobId, payload) {
  return request(`/jobs/${jobId}/vendor-bill`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateJobStatus(jobId, payload) {
  return request(`/jobs/${jobId}/status`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteJob(jobId) {
  return request(`/jobs/${jobId}`, { method: 'DELETE' })
}

export async function verifyJob(jobId, payload) {
  return request(`/jobs/${jobId}/verify`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function generateReport(jobId, payload) {
  return request(`/reports/${jobId}/generate`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function generateBilling(payload) {
  return request('/billing/generate', { method: 'POST', body: JSON.stringify(payload) })
}

export async function uploadPhotos(formData) {
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Upload failed')
  return data
}

export async function getBillingSummary(period = 'all') {
  return request(`/billing/summary?period=${period}`)
}
