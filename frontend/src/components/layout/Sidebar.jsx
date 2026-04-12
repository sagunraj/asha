import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  UsersIcon,
  HeartIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const NAV = [
  { to: '/admin',          icon: HomeIcon,   label: 'Dashboard' },
  { to: '/admin/donors',   icon: UsersIcon,  label: 'Donors'    },
  { to: '/admin/donations', icon: HeartIcon, label: 'Donations' },
]

const TAX_DOCS = {
  icon: DocumentTextIcon,
  label: 'Tax Documents',
  children: [
    { to: '/admin/receipts',           icon: DocumentTextIcon,      label: 'Receipts'  },
    { to: '/admin/receipt-templates',  icon: DocumentDuplicateIcon, label: 'Templates' },
  ],
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const taxOpen = TAX_DOCS.children.some(c => location.pathname.startsWith(c.to))
  const [taxExpanded, setTaxExpanded] = useState(taxOpen)

  const linkCls = (active) => `
    group flex items-center gap-2.5 px-3 py-[7px] rounded-[10px]
    text-[13px] font-medium transition-all duration-150
    ${active
      ? 'bg-[#EAF2FC] text-[#0071E3] dark:bg-[#003A80] dark:text-[#0A84FF]'
      : 'text-[#3A3A3C] dark:text-[#AEAEB2] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
    }
  `
  const iconCls = (active) => `
    w-[18px] h-[18px] flex-shrink-0 transition-colors
    ${active
      ? 'text-[#0071E3] dark:text-[#0A84FF]'
      : 'text-[#8E8E93] dark:text-[#636366] group-hover:text-[#3A3A3C] dark:group-hover:text-[#AEAEB2]'
    }
  `

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 flex-shrink-0 flex flex-col h-full
        bg-white dark:bg-[#1C1C1E]
        border-r border-[#E5E5EA] dark:border-[#3A3A3C]
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#F2F2F7] dark:border-[#2C2C2E] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#0071E3] flex items-center justify-center shadow-sm">
            <HeartSolid className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">Asha</p>
            <p className="text-[11px] text-[#8E8E93] leading-tight">KPALS</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg text-[#8E8E93] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = to === '/admin'
            ? location.pathname === '/admin'
            : location.pathname.startsWith(to)
          return (
            <Link key={to} to={to} onClick={onClose} className={linkCls(active)}>
              <Icon className={iconCls(active)} />
              {label}
            </Link>
          )
        })}

        {/* Tax Documents collapsible group */}
        <div>
          <button
            onClick={() => setTaxExpanded(e => !e)}
            className={`
              group flex items-center gap-2.5 w-full px-3 py-[7px] rounded-[10px]
              text-[13px] font-medium transition-all duration-150
              ${taxOpen
                ? 'text-[#0071E3] dark:text-[#0A84FF]'
                : 'text-[#3A3A3C] dark:text-[#AEAEB2] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }
            `}
          >
            <TAX_DOCS.icon className={iconCls(taxOpen)} />
            <span className="flex-1 text-left">{TAX_DOCS.label}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-[#8E8E93] transition-transform duration-200 ${taxExpanded ? 'rotate-180' : ''}`} />
          </button>
          {taxExpanded && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#E5E5EA] dark:border-[#3A3A3C] pl-2">
              {TAX_DOCS.children.map(({ to, icon: Icon, label }) => {
                const active = location.pathname.startsWith(to)
                return (
                  <Link key={to} to={to} onClick={onClose} className={linkCls(active)}>
                    <Icon className={iconCls(active)} />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom: theme + user + logout */}
      <div className="px-2.5 py-3 border-t border-[#F2F2F7] dark:border-[#2C2C2E] flex-shrink-0 space-y-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-[10px] text-[13px] font-medium
                     text-[#3A3A3C] dark:text-[#AEAEB2]
                     hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
        >
          {dark
            ? <SunIcon className="w-[18px] h-[18px] text-[#FF9500]" />
            : <MoonIcon className="w-[18px] h-[18px] text-[#8E8E93]" />
          }
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User info */}
        <div className="px-3 py-2 rounded-[10px] bg-[#F9F9FB] dark:bg-[#2C2C2E]">
          <p className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{user?.name || 'Admin'}</p>
          <p className="text-[11px] text-[#8E8E93] truncate mt-px">{user?.email}</p>
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-[10px] text-[13px] font-medium
                     text-[#FF3B30] hover:bg-[#FFF5F4] dark:hover:bg-[#3D1A1A] transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="w-[18px] h-[18px] flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
