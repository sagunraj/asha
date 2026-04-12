import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PlusIcon, PencilIcon, TrashIcon, EyeIcon, XMarkIcon, CodeBracketIcon,
} from '@heroicons/react/24/outline'
import api from '../../services/api'

// ── Supported placeholders ─────────────────────────────────────────────────────
const PLACEHOLDERS = [
  { label: 'Donor Name',     value: '{{donor_name}}' },
  { label: 'Donor Email',    value: '{{donor_email}}' },
  { label: 'Tax Year',       value: '{{tax_year}}' },
  { label: 'Amount ($)',     value: '{{total_amount}}' },
  { label: 'Amount (Words)', value: '{{total_amount_words}}' },
  { label: 'Receipt #',      value: '{{receipt_number}}' },
  { label: 'Date',           value: '{{date}}' },
  { label: 'Organization',   value: '{{organization_name}}' },
]

function currentYear() { return new Date().getFullYear() }

const SAMPLE_VALUES = {
  '{{donor_name}}':         'Jane Smith',
  '{{donor_email}}':        'jane.smith@example.com',
  '{{tax_year}}':           String(currentYear() - 1),
  '{{total_amount}}':       '$1,250.00',
  '{{total_amount_words}}': 'One Thousand Two Hundred Fifty Dollars and No Cents',
  '{{receipt_number}}':     `KPALS-${currentYear() - 1}-00001`,
  '{{date}}':               new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  '{{organization_name}}':  'KPALS',
}

const DEFAULT_BODY_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Tax Receipt {{receipt_number}}</title></head>
<body style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:640px;margin:40px auto;color:#1D1D1F;padding:0 20px;">
  <div style="border-bottom:3px solid #0071E3;padding-bottom:20px;margin-bottom:24px;">
    <h1 style="color:#0071E3;margin:0 0 4px;">{{organization_name}}</h1>
    <p style="margin:0;color:#6E6E73;font-size:14px;">Charitable Contribution Receipt</p>
  </div>
  <p style="font-size:15px;">Dear <strong>{{donor_name}}</strong>,</p>
  <p style="font-size:15px;">Thank you for your generous donation during the {{tax_year}} tax year. This serves as your official receipt of a tax-deductible contribution.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr style="background:#F5F5F7;"><td style="padding:10px 14px;font-weight:600;width:40%;">Receipt Number</td><td style="padding:10px 14px;">{{receipt_number}}</td></tr>
    <tr><td style="padding:10px 14px;font-weight:600;">Donor Name</td><td style="padding:10px 14px;">{{donor_name}}</td></tr>
    <tr style="background:#F5F5F7;"><td style="padding:10px 14px;font-weight:600;">Tax Year</td><td style="padding:10px 14px;">{{tax_year}}</td></tr>
    <tr><td style="padding:10px 14px;font-weight:600;">Total Contributions</td><td style="padding:10px 14px;"><strong>{{total_amount}}</strong></td></tr>
    <tr style="background:#F5F5F7;"><td style="padding:10px 14px;font-weight:600;">Amount in Words</td><td style="padding:10px 14px;">{{total_amount_words}}</td></tr>
    <tr><td style="padding:10px 14px;font-weight:600;">Date Issued</td><td style="padding:10px 14px;">{{date}}</td></tr>
  </table>
  <p style="font-size:13px;color:#6E6E73;border-top:1px solid #E5E5EA;padding-top:16px;">
    <strong>{{organization_name}}</strong> is a 501(c)(3) nonprofit organization. No goods or services were provided in exchange for your contribution. Please retain this receipt for your records.
  </p>
  <p style="font-size:12px;color:#AEAEB2;">Generated on {{date}}</p>
</body>
</html>`

// ── HTML preview modal ─────────────────────────────────────────────────────────
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

// ── designMode iframe visual editor ───────────────────────────────────────────
function DesignEditor({ value, onChange }) {
  const iframeRef = useRef(null)
  const lastHtml  = useRef(value)

  // Write content into iframe and enable designMode
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(value)
    doc.close()
    doc.designMode = 'on'
    // Sync changes back on every keystroke / mutation
    const sync = () => {
      const html = doc.documentElement.outerHTML
      if (html !== lastHtml.current) {
        lastHtml.current = html
        onChange(html)
      }
    }
    doc.addEventListener('input', sync)
    doc.addEventListener('keyup', sync)
    return () => {
      doc.removeEventListener('input', sync)
      doc.removeEventListener('keyup', sync)
    }
  // Only re-initialize when the modal opens (value identity changes on open)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Insert placeholder text at the current cursor position inside the iframe
  function insertAtCursor(text) {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    doc.execCommand('insertText', false, text)
    const html = doc.documentElement.outerHTML
    lastHtml.current = html
    onChange(html)
  }

  return { iframeRef, insertAtCursor }
}

// ── Template editor modal ──────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:      template?.name    || '',
    subject:   template?.subject || 'Your {{tax_year}} Tax Receipt from {{organization_name}}',
    body_html: template?.body_html || DEFAULT_BODY_HTML,
  })
  const [saving, setSaving]     = useState(false)
  const [editMode, setEditMode] = useState('visual') // 'visual' | 'source' | 'preview'

  // Refs for the two editor types
  const iframeRef       = useRef(null)
  const textareaRef     = useRef(null)
  const iframeInitDone  = useRef(false)

  const inputCls = "w-full px-4 py-2.5 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"

  // ── Wire up the designMode iframe when it mounts ───────────────────────────
  const initIframe = useCallback((iframe) => {
    if (!iframe || iframeInitDone.current) return
    iframeInitDone.current = true
    iframeRef.current = iframe
    const doc = iframe.contentDocument
    doc.open(); doc.write(form.body_html); doc.close()
    doc.designMode = 'on'
    const sync = () => {
      const html = doc.documentElement.outerHTML
      setForm(f => ({ ...f, body_html: html }))
    }
    doc.addEventListener('input', sync)
    doc.addEventListener('keyup', sync)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Insert placeholder at cursor (works in both modes) ────────────────────
  function insertPlaceholder(ph) {
    if (editMode === 'visual') {
      const doc = iframeRef.current?.contentDocument
      if (!doc) return
      doc.execCommand('insertText', false, ph)
      setForm(f => ({ ...f, body_html: doc.documentElement.outerHTML }))
      return
    }
    if (editMode === 'source') {
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart
      const end   = el.selectionEnd
      const newVal = form.body_html.slice(0, start) + ph + form.body_html.slice(end)
      setForm(f => ({ ...f, body_html: newVal }))
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + ph.length
        el.focus()
      })
    }
  }

  // ── Insert image from URL (works in both modes) ──────────────────────────
  function insertImage() {
    const url = window.prompt('Image URL')
    if (!url) return
    if (editMode === 'visual') {
      const doc = iframeRef.current?.contentDocument
      if (!doc) return
      doc.execCommand('insertImage', false, url)
      setForm(f => ({ ...f, body_html: doc.documentElement.outerHTML }))
      return
    }
    if (editMode === 'source') {
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart
      const end   = el.selectionEnd
      const imgTag = `<img src="${url}" style="max-width:100%; height:auto;" alt="image" />`
      const newVal = form.body_html.slice(0, start) + imgTag + form.body_html.slice(end)
      setForm(f => ({ ...f, body_html: newVal }))
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + imgTag.length
        el.focus()
      })
    }
  }

  const previewHtml = Object.entries(SAMPLE_VALUES).reduce(
    (h, [k, v]) => h.replaceAll(k, v),
    form.body_html,
  )

  async function handleSave() {
    if (!form.name.trim() || !form.body_html.trim()) return
    setSaving(true)
    try {
      const saved = template?.id
        ? await api.updateTemplate(template.id, form)
        : await api.createTemplate(form)
      onSaved(saved)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const modeBtn = (mode, label, Icon) => (
    <button
      onClick={() => setEditMode(mode)}
      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
        editMode === mode
          ? 'bg-[#0071E3] text-white'
          : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-gray-200 dark:hover:bg-[#3A3A3C]'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            {template?.id ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name + Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1.5">Template Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Standard Receipt 2025"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1.5">Email Subject</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Your {{tax_year}} Tax Receipt"
                className={inputCls}
              />
            </div>
          </div>

          {/* Placeholder insert buttons */}
          <div>
            <p className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-2">Insert Dynamic Field</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => insertPlaceholder(p.value)}
                  disabled={editMode === 'preview'}
                  className="px-3 py-1 text-xs font-mono font-medium bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#0071E3] rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div>
              <button
                type="button"
                onClick={insertImage}
                disabled={editMode === 'preview'}
                className="px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Insert Image from URL
              </button>
            </div>
          </div>

          {/* Editor mode tabs */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              {modeBtn('visual', 'Visual Editor', EyeIcon)}
              {modeBtn('source', 'HTML Source', CodeBracketIcon)}
              {modeBtn('preview', 'Preview (sample data)', EyeIcon)}
            </div>

            {/* Visual: designMode iframe — renders full HTML live, nothing stripped */}
            <div style={{ display: editMode === 'visual' ? 'block' : 'none' }}>
              <iframe
                ref={initIframe}
                className="w-full rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white"
                style={{ height: '360px', border: 'none' }}
                title="visual-editor"
              />
            </div>

            {editMode === 'source' && (
              <textarea
                ref={textareaRef}
                value={form.body_html}
                onChange={e => setForm(f => ({ ...f, body_html: e.target.value }))}
                className="w-full h-72 px-4 py-3 bg-[#F5F5F7] dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] resize-y transition-colors"
                spellCheck={false}
              />
            )}

            {editMode === 'preview' && (
              <iframe
                srcDoc={previewHtml}
                className="w-full rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white"
                style={{ height: '360px', border: 'none' }}
                sandbox="allow-same-origin"
                title="preview"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#6E6E73] bg-gray-100 dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.body_html.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0071E3] rounded-xl hover:bg-[#0077ED] disabled:opacity-50 transition-colors"
          >{saving ? 'Saving…' : 'Save Template'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReceiptTemplatesPage() {
  const [templates, setTemplates]   = useState([])
  const [loadingT, setLoadingT]     = useState(true)
  const [editing, setEditing]       = useState(null)     // null | {} (new) | template obj
  const [previewHtml, setPreviewHtml] = useState(null)

  const loadTemplates = useCallback(() => {
    setLoadingT(true)
    api.getTemplates()
      .then(d => setTemplates(d.results || d || []))
      .catch(console.error)
      .finally(() => setLoadingT(false))
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return
    try { await api.deleteTemplate(id); loadTemplates() } catch (err) { alert(err.message) }
  }

  function handleSaved() {
    setEditing(null)
    loadTemplates()
  }

  function previewTemplate(t) {
    const filled = Object.entries(SAMPLE_VALUES).reduce(
      (h, [k, v]) => h.replaceAll(k, v),
      t.body_html,
    )
    setPreviewHtml(filled)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Receipt Templates</h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Manage email templates used for generating tax receipts.</p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ED] transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C]">
          <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            Templates <span className="ml-2 text-[#6E6E73] dark:text-[#8E8E93] font-normal">({templates.length})</span>
          </p>
        </div>
        {loadingT ? (
          <div className="py-12 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">No templates yet.</p>
            <p className="text-xs text-[#AEAEB2] dark:text-[#636366] mt-1">Click "New Template" to create one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-[#3A3A3C]">
            {templates.map(t => (
              <li key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{t.name}</p>
                    {t.is_active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] truncate mt-0.5">{t.subject}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                  <button onClick={() => previewTemplate(t)} className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded-lg transition-colors" title="Preview">
                    <EyeIcon className="w-4 h-4" />
                  </button>

                  <button onClick={() => setEditing(t)} className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded-lg transition-colors" title="Edit">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing !== null && (
        <TemplateModal
          template={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {previewHtml && <HtmlModal html={previewHtml} title="Template Preview" onClose={() => setPreviewHtml(null)} />}
    </div>
  )
}
