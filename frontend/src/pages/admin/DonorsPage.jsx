import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'

const CATEGORIES = ['one_time', 'recurring', 'major', 'member']
const CAT_LABEL   = { one_time: 'One-time', recurring: 'Recurring', major: 'Major', member: 'Member' }
const CAT_BADGE   = {
  one_time:  'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  recurring: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  major:     'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  member:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}
function fmt(v) { return `$${parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` }

function formatLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const EMPTY = {
  name: '', email: '', phone: '', address: '', city: '', state: '',
  zip_code: '', country: 'United States', category: 'one_time',
  opt_in_email: true, opt_in_newsletter: true, notes: '',
}

const INPUT_CLS = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors'

function Modal({ title, onClose, onSubmit, form, setForm, saving }) {
  function field(label, key, type = 'text', required = false) {
    return (
      <div>
        <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">{label}{required && ' *'}</label>
        <input
          type={type}
          required={required}
          value={form[key] || ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className={INPUT_CLS}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#3A3A3C] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {field('Full Name', 'name', 'text', true)}
              {field('Email', 'email', 'email', true)}
              {field('Phone', 'phone')}
              {field('Country', 'country')}
            </div>
            {field('Address', 'address')}
            <div className="grid grid-cols-3 gap-4">
              {field('City', 'city')}
              {field('State', 'state')}
              {field('ZIP', 'zip_code')}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className={INPUT_CLS}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
              </select>
            </div>
            <div className="flex gap-6">
              {[['opt_in_email', 'Email opt-in'], ['opt_in_newsletter', 'Newsletter opt-in']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))}
                    className="rounded border-gray-300 text-[#0071E3] focus:ring-[#0071E3]"
                  />
                  {l}
                </label>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">Notes</label>
              <textarea
                rows={2}
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={`${INPUT_CLS} resize-none`}
              />
            </div>
          </div>
          <div className="px-6 pb-5 flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-gray-100 dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#0071E3] rounded-xl hover:bg-[#0077ED] transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DonorsPage() {
  const [donors, setDonors]     = useState([])
  const [count, setCount]       = useState(0)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [modal, setModal]       = useState(null)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    api.getDonors({ search: search || undefined, page, limit: LIMIT })
      .then(d => { setDonors(d.results); setCount(d.count) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY); setEditing(null); setModal('create') }
  function openEdit(d)  {
    setForm({
      name: d.name, email: d.email, phone: d.phone || '',
      address: d.address || '', city: d.city || '', state: d.state || '',
      zip_code: d.zip_code || '', country: d.country || 'United States',
      category: d.category, opt_in_email: d.opt_in_email, opt_in_newsletter: d.opt_in_newsletter,
      notes: d.notes || '',
    })
    setEditing(d)
    setModal('edit')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.createDonor(form)
      } else {
        await api.updateDonor(editing.id, form)
      }
      setModal(null)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(donor) {
    if (!window.confirm(`Delete donor "${donor.name}"? This cannot be undone.`)) return
    try {
      await api.deleteDonor(donor.id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {modal && (
        <Modal
          title={modal === 'create' ? 'Add Donor' : 'Edit Donor'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          form={form}
          setForm={setForm}
          saving={saving}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Donors</h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{count} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Donor
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEB2]" />
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          onFocus={() => donors.length > 0 && setSuggestOpen(true)}
          onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#AEAEB2] dark:placeholder-[#636366] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"
        />
        {suggestOpen && donors.length > 0 && (
          <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {donors.slice(0, 6).map(d => (
              <li
                key={d.id}
                onMouseDown={() => { setSearch(d.name); setPage(1); setSuggestOpen(false) }}
                className="px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between gap-3 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]"
              >
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{d.name}</span>
                <span className="text-xs text-[#8E8E93] flex-shrink-0">{d.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-[#FF3B30]">{error}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#3A3A3C]">
                {['Name', 'Email', 'Category', 'Total Given', 'Donations', 'Last Gift', ''].map(h => (
                  <th key={h} className="text-left py-3 px-6 text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading…</td>
                </tr>
              ) : donors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">No donors found.</td>
                </tr>
              ) : donors.map(d => (
                <tr key={d.id} className="border-b border-gray-50 dark:border-[#3A3A3C]/50 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors">
                  <td className="py-3.5 px-6 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{d.name}</td>
                  <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93]">{d.email}</td>
                  <td className="py-3.5 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CAT_BADGE[d.category] || CAT_BADGE.one_time}`}>
                      {CAT_LABEL[d.category] || d.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{fmt(d.total_donations)}</td>
                  <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93]">{d.number_of_donations}</td>
                  <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
                    {d.last_donation_date
                      ? formatLocalDate(d.last_donation_date)
                      : '—'}
                  </td>
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] hover:text-[#0071E3] transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-[#FF3B30] transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C] flex items-center justify-between">
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-gray-100 dark:bg-[#2C2C2E] rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-gray-100 dark:bg-[#2C2C2E] rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
