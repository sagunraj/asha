import { useState, useEffect } from 'react'
import { ArrowLeftOnRectangleIcon, HeartIcon, SunIcon, MoonIcon, DocumentTextIcon, EyeIcon, EnvelopeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm">
      <p className="text-sm font-medium text-[#6E6E73] dark:text-[#8E8E93]">{label}</p>
      <p className="text-3xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">{value}</p>
      {sub && <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">{sub}</p>}
    </div>
  )
}

const STATUS_BADGE = {
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending:   'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  failed:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-[#2C2C2E] dark:text-[#8E8E93]',
}

const SOURCE_LABEL = {
  check: 'Check', cash: 'Cash', bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card', paypal: 'PayPal', other: 'Other',
}

function fmt(v) { return `$${parseFloat(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` }

function currentYear() { return new Date().getFullYear() }
function yearOptions() {
  const y = currentYear()
  return Array.from({ length: y - 2018 }, (_, i) => y - i)
}

export default function DonorDashboard() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const [year, setYear]           = useState(currentYear())
  const [stats, setStats]         = useState(null)
  const [donations, setDonations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [receipt, setReceipt]           = useState(null)
  const [receiptError, setReceiptError] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailMsg, setEmailMsg]         = useState('')
  const [viewHtml, setViewHtml]         = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      api.getDonationStats({ tax_year: year }),
      api.getDonations({ tax_year: year }),
    ])
      .then(([s, d]) => {
        if (!cancelled) {
          setStats(s)
          setDonations(d.results || [])
        }
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year])

  useEffect(() => {
    setReceipt(null)
    setReceiptError('')
    api.getMyReceipts({ tax_year: year })
      .then(list => setReceipt(list[0] || null))
      .catch(() => {})
  }, [year])



  async function handleSendReceiptEmail() {
    if (!receipt) return
    setSendingEmail(true)
    setEmailMsg('')
    try {
      await api.sendMyReceiptEmail(receipt.id)
      setReceipt(r => ({ ...r, email_delivery_status: 'sent' }))
      setEmailMsg('Receipt sent to your email!')
    } catch (err) {
      setEmailMsg(err.message)
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#3A3A3C] px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#0071E3] flex items-center justify-center">
            <HeartIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Asha</p>
            <p className="text-[11px] text-[#8E8E93]">Donor Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right mr-1">
            <p className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{user?.name}</p>
            <p className="text-[11px] text-[#8E8E93]">{user?.email}</p>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-[#8E8E93] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
            title="Toggle theme"
          >
            {dark ? <SunIcon className="w-5 h-5 text-[#FF9500]" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] hover:text-[#FF3B30] transition-colors"
            title="Sign out"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Heading + year picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">My Donations</h1>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Your giving history</p>
          </div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-2 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-colors"
          >
            {yearOptions().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-[#FF3B30]">{error}</div>
        )}

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Donations" value={stats.total_donations} />
            <StatCard label="Total Given" value={fmt(stats.total_amount)} />
            <StatCard
              label="Average Gift"
              value={stats.total_donations > 0 ? fmt(stats.average_donation) : '—'}
            />
          </div>
        )}

        {/* Tax Receipt Card */}
        {(receipt || donations.length > 0) && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-5 h-5 text-[#0071E3]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{year} Tax Receipt</p>
                  {receipt ? (
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                      {receipt.receipt_number} &middot; ${parseFloat(receipt.total_amount).toFixed(2)}
                      &nbsp;&middot;&nbsp;
                      <span className={receipt.email_delivery_status === 'sent' ? 'text-green-600 dark:text-green-400' : ''}>
                        {receipt.email_delivery_status === 'sent' ? 'Email sent' : 'Email pending'}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Not yet generated</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {receipt && (
                  <>
                    <button
                      onClick={() => setViewHtml(receipt.receipt_html)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#6E6E73] bg-gray-100 dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"
                    >
                      <EyeIcon className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={handleSendReceiptEmail}
                      disabled={sendingEmail}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0071E3] bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                      {sendingEmail ? 'Sending…' : 'Send to Email'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {receiptError && (
              <p className="mt-3 text-xs text-[#FF3B30]">{receiptError}</p>
            )}
            {emailMsg && (
              <p className={`mt-3 text-xs ${emailMsg.includes('sent') ? 'text-green-600 dark:text-green-400' : 'text-[#FF3B30]'}`}>{emailMsg}</p>
            )}
          </div>
        )}

        {/* Donations table */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C]">
            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {year} Donations
              <span className="ml-2 text-[#6E6E73] dark:text-[#8E8E93] font-normal">({donations.length})</span>
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading…</div>
          ) : donations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">No donations found for {year}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#3A3A3C]">
                    {['Date', 'Amount', 'Type', 'Source', 'Status'].map(h => (
                      <th key={h} className="text-left py-3 px-6 text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {donations.map(d => (
                    <tr key={d.id} className="border-b border-gray-50 dark:border-[#3A3A3C]/50 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors">
                      <td className="py-3.5 px-6 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {(() => { const [y, m, day] = d.donation_date.split('-'); return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })()}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {fmt(d.amount)}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93] capitalize">
                        {d.donation_type.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
                        {SOURCE_LABEL[d.source] || d.source}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[d.status] || STATUS_BADGE.cancelled}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Receipt HTML preview modal */}
      {viewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C] flex-shrink-0">
              <h2 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{year} Tax Receipt</h2>
              <button
                onClick={() => setViewHtml(null)}
                className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <iframe
              srcDoc={viewHtml}
              className="flex-1 w-full rounded-b-2xl bg-white"
              style={{ minHeight: '500px', border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
