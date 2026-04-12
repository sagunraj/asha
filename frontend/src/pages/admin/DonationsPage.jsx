import { useState, useEffect, useCallback, useRef } from 'react'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'

function formatLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmt(v) { return `$${parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` }

const STATUS_OPTS  = ['pending', 'completed', 'failed', 'cancelled']
const SOURCE_OPTS  = ['check', 'cash', 'bank_transfer', 'credit_card', 'paypal', 'other']
const TYPE_OPTS    = ['one_time', 'recurring']
const FREQ_OPTS    = ['monthly', 'quarterly', 'yearly']
const SOURCE_LABEL = { check: 'Check', cash: 'Cash', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card', paypal: 'PayPal', other: 'Other' }
const STATUS_BADGE = {
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending:   'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  failed:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-[#2C2C2E] dark:text-[#8E8E93]',
}

function currentYear() { return new Date().getFullYear() }
function yearOptions() { const y = currentYear(); return Array.from({ length: y - 2018 }, (_, i) => y - i) }

const EMPTY = {
  donor_id: '', amount: '', donation_date: new Date().toISOString().slice(0, 10),
  donation_type: 'one_time', is_recurring: false, recurrence_frequency: '',
  source: 'check', status: 'completed', reference_number: '', notes: '', campaign_id: '',
}

const INPUT_CLS = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors'

function DonorCombobox({ donors, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef(null)

  const selected = donors.find(d => d.id === value)

  const filtered = (query
    ? donors.filter(d => {
        const q = query.toLowerCase()
        return d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q)
      })
    : donors
  ).slice(0, 8)

  const displayValue = focused ? query : (selected ? `${selected.name} (${selected.email})` : query)

  function handleFocus() {
    setFocused(true)
    setOpen(true)
    setQuery('')
  }

  function handleBlur() {
    setTimeout(() => {
      setFocused(false)
      setOpen(false)
      setQuery('')
    }, 150)
  }

  function handleSelect(d) {
    onChange(d.id)
    setQuery('')
    setOpen(false)
    setFocused(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={displayValue}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search by name or email…"
        className={INPUT_CLS}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map(d => (
            <li
              key={d.id}
              onMouseDown={() => handleSelect(d)}
              className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between gap-3 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] ${d.id === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{d.name}</span>
              <span className="text-xs text-[#8E8E93] flex-shrink-0">{d.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DonationModal({ mode, form, setForm, onClose, onSubmit, saving, donors, campaigns }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#3A3A3C] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{mode === 'create' ? 'Add Donation' : 'Edit Donation'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {mode === 'create' && (
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Donor *</label>
                <DonorCombobox
                  donors={donors}
                  value={form.donor_id}
                  onChange={id => setForm(f => ({ ...f, donor_id: id }))}
                />
                {/* hidden required guard */}
                <input type="text" required value={form.donor_id} onChange={() => {}} className="sr-only" tabIndex={-1} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Amount *</label>
                <input type="number" required step="0.01" min="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Date *</label>
                <input type="date" required value={form.donation_date}
                  onChange={e => setForm(f => ({ ...f, donation_date: e.target.value }))}
                  className={INPUT_CLS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className={INPUT_CLS}>
                  {SOURCE_OPTS.map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className={INPUT_CLS}>
                  {STATUS_OPTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Type</label>
                <select value={form.donation_type} onChange={e => setForm(f => ({ ...f, donation_type: e.target.value, is_recurring: e.target.value === 'recurring' }))}
                  className={INPUT_CLS}>
                  {TYPE_OPTS.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', '-')}</option>)}
                </select>
              </div>
              {form.is_recurring && (
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Frequency</label>
                  <select value={form.recurrence_frequency} onChange={e => setForm(f => ({ ...f, recurrence_frequency: e.target.value }))}
                    className={INPUT_CLS}>
                    <option value="">Select…</option>
                    {FREQ_OPTS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
              )}
            </div>
            {campaigns.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Campaign (optional)</label>
                <select value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                  className={INPUT_CLS}>
                  <option value="">None</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Reference #</label>
              <input type="text" value={form.reference_number || ''} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Notes</label>
              <textarea rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={`${INPUT_CLS} resize-none`} />
            </div>
          </div>
          <div className="px-6 pb-5 flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-gray-100 dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#0071E3] rounded-xl hover:bg-[#0077ED] transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DonationsPage() {
  const [donations, setDonations] = useState([])
  const [count, setCount]         = useState(0)
  const [search, setSearch]       = useState('')
  const [year, setYear]           = useState('')
  const [status, setStatus]       = useState('')
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [donors, setDonors]       = useState([])
  const [campaigns, setCampaigns] = useState([])

  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    api.getDonations({ search: search || undefined, tax_year: year || undefined, status: status || undefined, page, limit: LIMIT })
      .then(d => { setDonations(d.results); setCount(d.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, year, status, page])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm(EMPTY)
    setEditing(null)
    setModal('create')
    if (donors.length === 0) api.getDonors({ limit: 200 }).then(d => setDonors(d.results)).catch(console.error)
    api.getCampaigns().then(setCampaigns).catch(console.error)
  }

  function openEdit(d) {
    setForm({
      donor_id: d.donor_id, amount: d.amount, donation_date: d.donation_date,
      donation_type: d.donation_type, is_recurring: d.donation_type === 'recurring',
      recurrence_frequency: d.recurrence_frequency || '',
      source: d.source, status: d.status,
      reference_number: d.reference_number || '', notes: d.notes || '', campaign_id: d.campaign_id || '',
    })
    setEditing(d)
    setModal('edit')
    api.getCampaigns().then(setCampaigns).catch(console.error)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount) }
    if (!payload.campaign_id) delete payload.campaign_id
    if (!payload.recurrence_frequency) delete payload.recurrence_frequency
    if (!payload.reference_number) delete payload.reference_number
    try {
      modal === 'create' ? await api.createDonation(payload) : await api.updateDonation(editing.id, payload)
      setModal(null)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(d) {
    if (!window.confirm(`Delete this donation of $${parseFloat(d.amount).toFixed(2)}?`)) return
    try {
      await api.deleteDonation(d.id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const totalPages = Math.ceil(count / LIMIT)
  const FILTER_CLS = 'px-3 py-2.5 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {modal && (
        <DonationModal
          mode={modal} form={form} setForm={setForm}
          onClose={() => setModal(null)} onSubmit={handleSubmit}
          saving={saving} donors={donors} campaigns={campaigns}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Donations</h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{count} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Donation
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEB2] dark:text-[#636366]" />
          <input type="search" placeholder="Search donors…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#AEAEB2] dark:placeholder-[#636366] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors" />
        </div>
        <select value={year} onChange={e => { setYear(e.target.value); setPage(1) }} className={FILTER_CLS}>
          <option value="">All years</option>
          {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className={FILTER_CLS}>
          <option value="">All statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#3A3A3C]">
                {['Date', 'Donor', 'Amount', 'Source', 'Type', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-3 px-6 text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading…</td></tr>
              ) : donations.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">No donations found.</td></tr>
              ) : donations.map(d => (
                <tr key={d.id} className="border-b border-gray-50 dark:border-[#3A3A3C]/50 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors">
                  <td className="py-3.5 px-6 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {formatLocalDate(d.donation_date)}
                  </td>
                  <td className="py-3.5 px-6 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{d.donor_name}</td>
                  <td className="py-3.5 px-6 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{fmt(d.amount)}</td>
                  <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93]">{SOURCE_LABEL[d.source] || d.source}</td>
                  <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93] capitalize">{d.donation_type.replace('_', '-')}</td>
                  <td className="py-3.5 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[d.status] || STATUS_BADGE.cancelled}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] hover:text-[#0071E3] transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-[#FF3B30] transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C] flex items-center justify-between">
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-gray-100 dark:bg-[#2C2C2E] rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-gray-100 dark:bg-[#2C2C2E] rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
