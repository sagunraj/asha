import { useState, useEffect } from 'react'
import {
  UsersIcon, HeartIcon, CurrencyDollarIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline'
import api from '../../services/api'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#6E6E73] dark:text-[#8E8E93]">{label}</p>
        <p className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function fmt(v) {
  return `$${parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

const STATUS_BADGE = {
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending:   'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  failed:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-[#2C2C2E] dark:text-[#8E8E93]',
}

export default function AdminDashboard() {
  const [donorStats, setDonorStats]       = useState(null)
  const [donationStats, setDonationStats] = useState(null)
  const [recent, setRecent]               = useState([])
  const [loading, setLoading]             = useState(true)

  const thisYear = new Date().getFullYear()

  useEffect(() => {
    Promise.all([
      api.getDonorStats(),
      api.getDonationStats({ tax_year: thisYear }),
      api.getDonations({ limit: 8 }),
    ])
      .then(([ds, dos, rec]) => {
        setDonorStats(ds)
        setDonationStats(dos)
        setRecent(rec.results || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading…</div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Overview</h1>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">Welcome back — here's what's happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={UsersIcon}
          label="Total Donors"
          value={donorStats?.total ?? '—'}
          color="bg-[#0071E3]"
        />
        <StatCard
          icon={HeartIcon}
          label="Donations This Year"
          value={donationStats?.total_donations ?? '—'}
          color="bg-[#34C759]"
        />
        <StatCard
          icon={CurrencyDollarIcon}
          label={`Raised ${thisYear}`}
          value={donationStats ? fmt(donationStats.total_amount) : '—'}
          color="bg-[#FF9500]"
        />
        <StatCard
          icon={DocumentTextIcon}
          label="New Donors (YTD)"
          value={donorStats?.new_this_year ?? '—'}
          color="bg-[#AF52DE]"
        />
      </div>

      {/* Recent donations */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3A3A3C]">
          <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Recent Donations</p>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">No donations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#3A3A3C]">
                  {['Date', 'Donor', 'Amount', 'Source', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-6 text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(d => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-[#3A3A3C]/50 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors">
                    <td className="py-3.5 px-6 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {new Date(d.donation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-6 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{d.donor_name}</td>
                    <td className="py-3.5 px-6 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{fmt(d.amount)}</td>
                    <td className="py-3.5 px-6 text-sm text-[#6E6E73] dark:text-[#8E8E93] capitalize">{d.source?.replace('_', ' ')}</td>
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
  )
}
