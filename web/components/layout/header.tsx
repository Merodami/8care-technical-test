'use client'

import { useAuth } from '@/hooks'
import { useUIStore } from '@/stores'

export function Header() {
  const { user, logout } = useAuth()
  const { toggleSidebar } = useUIStore()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center px-4">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 mr-4"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="flex-1">
        <h1 className="text-xl font-semibold">8Care</h1>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="text-right">
              <p className="text-sm font-medium">
                {user.profile?.firstName} {user.profile?.lastName}
              </p>
              <p className="text-xs text-slate-500">{user.roles.join(', ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  )
}
