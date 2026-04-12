let _token = null

const api = {
  setToken(t) { _token = t },

  async request(method, url, body) {
    const headers = { 'Content-Type': 'application/json' }
    if (_token) headers['Authorization'] = `Bearer ${_token}`

    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || err.error || err.message || `HTTP ${res.status}`)
    }

    if (res.status === 204) return null
    return res.json()
  },

  get:    (url, params) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString() : ''
    return api.request('GET', url + qs)
  },
  post:   (url, body)   => api.request('POST',  url, body),
  patch:  (url, body)   => api.request('PATCH',  url, body),
  delete: (url)         => api.request('DELETE', url),

  sendOTP:     (email)         => api.post('/api/v1/auth/send-otp/', { email }),
  verifyOTP:   (email, otp)    => api.post('/api/v1/auth/verify-otp/', { email, otp }),
  adminLogin:  (email, pass)   => api.post('/api/v1/auth/admin-login/', { email, password: pass }),

  getDonors:          (p) => api.get('/api/v1/donors/', p),
  getDonorStats:      ()  => api.get('/api/v1/donors/statistics/'),
  getDonor:           (id) => api.get(`/api/v1/donors/${id}/`),
  createDonor:        (b) => api.post('/api/v1/donors/', b),
  updateDonor:        (id, b) => api.patch(`/api/v1/donors/${id}/`, b),
  deleteDonor:        (id) => api.delete(`/api/v1/donors/${id}/`),
  getCampaigns:       ()  => api.get('/api/v1/donors/campaigns/'),

  getDonations:       (p) => api.get('/api/v1/donations/', p),
  getDonationStats:   (p) => api.get('/api/v1/donations/statistics/', p),
  createDonation:     (b) => api.post('/api/v1/donations/', b),
  updateDonation:     (id, b) => api.patch(`/api/v1/donations/${id}/`, b),
  deleteDonation:     (id) => api.delete(`/api/v1/donations/${id}/`),

  getTaxReceipts:     (p) => api.get('/api/v1/tax-receipts/', p),
  generateReceipts:   (y, templateId) => api.post(`/api/v1/tax-receipts/generate/?tax_year=${y}${templateId ? `&template_id=${templateId}` : ''}`),
  sendReceiptEmail:   (id) => api.post(`/api/v1/tax-receipts/${id}/send-email/`),
  deleteReceipt:      (id) => api.delete(`/api/v1/tax-receipts/${id}/`),
  getTemplates:       ()  => api.get('/api/v1/tax-receipts/templates/'),
  getTemplate:        (id) => api.get(`/api/v1/tax-receipts/templates/${id}/`),
  createTemplate:     (b) => api.post('/api/v1/tax-receipts/templates/', b),
  updateTemplate:     (id, b) => api.patch(`/api/v1/tax-receipts/templates/${id}/`, b),
  deleteTemplate:     (id) => api.delete(`/api/v1/tax-receipts/templates/${id}/`),


  getMyReceipts:      (p) => api.get('/api/v1/tax-receipts/my/', p),
  generateMyReceipt:  (y) => api.post(`/api/v1/tax-receipts/my/generate/?tax_year=${y}`),
  sendMyReceiptEmail: (id) => api.post(`/api/v1/tax-receipts/my/${id}/send-email/`),
}

export default api
