import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon, EnvelopeIcon, EyeIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'

function fmt(v) { return `$${parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` }

function currentYear() { return new Date().getFullYear() }
function yearOptions() { const y = currentYear(); return Array.from({ length: y - 2018 }, (_, i) => y - i) }

const EMAIL_BADGE = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-[#2C2C2E] dark:text-[#8E8E93]',
  sent:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed:  'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function HtmlModal({ html, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <iframe srcDoc={html} className="flex-1 w-full rounded-b-2xl bg-white" style={{ minHeight: '500px', border: 'none' }} sandbox="allow-same-origin" />
      </div>
    </div>
  )
}

export default function ReceiptsPage() {
  const [receipts, setReceipts]         = useState([])
  const [count, setCount]               = useState(0)
  const [year, setYear]                 = useState(currentYear() - 1)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(true)
  const [generating, setGenerating]     = useState(false)
  const [genResult, setGenResult]       = useState(null)
  const [selected, setSelected]         = useState(new Set())
  const [bulkSending, setBulkSending]   = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)
  const [sendingId, setSendingId]       = useState(null)
  const [previewHtml, setPreviewHtml]   = useState(null)
  const [templates, setTemplates]       = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const LIMIT = 30

  const load = useCallback(() => {
    setLoading(true)
    setSelected(new Set())
    api.getTaxReceipts({ tax_year: year, page, limit: LIMIT })
      .then(d => { setReceipts(d.results || []); setCount(d.count || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.getTemplates()
      .then(d => {
        const list = Array.isArray(d) ? d : (d.results || [])
        const active = list.filter(t => t.is_active)
        setTemplates(active)
        if (active.length > 0 && !selectedTemplate) {
          setSelectedTemplate(active[0].id)
        }
      })
      .catch(console.error)
  }, [])

  async function handleGenerate() {
    if (!window.confirm(`Generate tax receipts for ${year}? Existing receipts will be skipped.`)) return
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await api.generateReceipts(year, selectedTemplate)
      setGenResult(res)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendOne(id) {
    setSendingId(id)
    try {
      await api.sendReceiptEmail(id)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSendingId(null)
    }
  }

  async function handleDeleteReceipt(id) {
    if (!window.confirm('Delete this receipt? This action cannot be undone.')) return
    try {
      await api.deleteReceipt(id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleSelectAll() {
    setSelected(s => s.size === receipts.length ? new Set() : new Set(receipts.map(r => r.id)))
  }

  async function handleBulkSend() {
    const ids = [...selected]
    if (!window.confirm(`Send emails to ${ids.length} donor${ids.length !== 1 ? 's' : ''}?`)) return
    setBulkSending(true)
    setBulkProgress({ done: 0, total: ids.length, failed: 0 })
    for (const id of ids) {
      try {
        await api.sendReceiptEmail(id)
        setBulkProgress(p => ({ ...p, done: p.done + 1 }))
      } catch {
        setBulkProgress(p => ({ ...p, done: p.done + 1, failed: p.failed + 1 }))
      }
    }
    setBulkSending(false)
    setBulkProgress(null)
    load()
  }

  const totalPages = Math.ceil(count / LIMIT)
  const selectCls = "px-4 py-2 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Receipts</h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Generate and send annual tax receipts to donors.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => { setYear(Number(e.target.value)); setPage(1) }} className={selectCls}>
            {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {templates.length > 0 && (
            <select value={selectedTemplate || ''} onChange={e => setSelectedTemplate(e.target.value)} className={selectCls}>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating || templates.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : `Generate ${year} Receipts`}
          </button>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBulkSend}
            disabled={bulkSending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <EnvelopeIcon className="w-4 h-4" />
            {bulkSending
              ? `Sending… (${bulkProgress?.done}/${bulkProgress?.total})`
              : `Send to Selected (${selected.size})`}
          </button>
        )}
      </div>

      {genResult && (
        <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-400">
          Generated <strong>{genResult.created}</strong> new receipt{genResult.created !== 1 ? 's' : ''}.
          {genResult.skipped > 0 && <> Skipped {genResult.skipped} existing.</>}
        </div>
      )}

      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            {year} Receipts <span className="ml-2 text-[#6E6E73] dark:text-[#8E8E93] font-normal">({count})</span>
          </p>
          {receipts.length > 0 && (
            <button onClick={toggleSelectAll} className="text-xs text-[#0071E3] hover:underline">
              {selected.size === receipts.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#3A3A3C]">
                <th className="w-10 py-3 px-4" />
                {['Receipt #', 'Donor', 'Amount', 'Email Status', 'Sent At', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading…</td></tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">No receipts for {year}.</p>
                    <p className="text-xs text-[#AEAEB2] dark:text-[#636366] mt-1">Click "Generate {year} Receipts" to create them.</p>
                  </td>
                </tr>
              ) : receipts.map(r => (
                <tr key={r.id} className={`border-b border-gray-50 dark:border-[#3A3A3C]/50 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors ${selected.has(r.id) ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded accent-[#0071E3]" />
                  </td>
                  <td className="py-3.5 px-4 text-sm font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">{r.receipt_number}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{r.donor_name}</p>
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">{r.donor_email}</p>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{fmt(r.total_amount)}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${EMAIL_BADGE[r.email_delivery_status] || EMAIL_BADGE.pending}`}>
                      {r.email_delivery_status || 'pending'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
                    {r.email_sent_at ? new Date(r.email_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      {r.receipt_html && (
                        <button
                          onClick={() => setPreviewHtml(r.receipt_html)}
                          className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] rounded-lg transition-colors"
                          title="Preview receipt"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSendOne(r.id)}
                        disabled={sendingId === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0071E3] bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                      >
                        <EnvelopeIcon className="w-3.5 h-3.5" />
                        {sendingId === r.id ? 'Sending…' : 'Send'}
                      </button>
                      <button
                        onClick={() => handleDeleteReceipt(r.id)}
                        className="p-1.5 text-[#A2A2A7] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete receipt"
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

      {previewHtml && <HtmlModal html={previewHtml} title="Receipt Preview" onClose={() => setPreviewHtml(null)} />}
    </div>
  )
}
