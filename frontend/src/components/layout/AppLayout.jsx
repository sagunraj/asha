import { useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-black">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top-bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#3A3A3C]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[9px] bg-[#0071E3] flex items-center justify-center">
              <HeartIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[13px] font-semibold text-[#1D1D1F]">Asha</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[#6E6E73] hover:bg-gray-100 transition-colors"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
