'use client'

import { useAuth, usePermissions } from '@/hooks'

export default function DashboardPage() {
  const { user } = useAuth()
  const { isSuperAdmin, isCoordinator, isCaregiver, isPatient } = usePermissions()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Welcome back, {user?.profile?.firstName}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isSuperAdmin() && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-blue-600">--</p>
              <p className="text-sm text-slate-500 mt-2">All system users</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
              <p className="text-3xl font-bold text-green-600">--</p>
              <p className="text-sm text-slate-500 mt-2">Last 24 hours</p>
            </div>
          </>
        )}

        {isCoordinator() && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Caregivers</h3>
              <p className="text-3xl font-bold text-blue-600">--</p>
              <p className="text-sm text-slate-500 mt-2">Active caregivers</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Patients</h3>
              <p className="text-3xl font-bold text-purple-600">--</p>
              <p className="text-sm text-slate-500 mt-2">Active patients</p>
            </div>
          </>
        )}

        {(isCaregiver() || isPatient()) && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Profile Summary</h3>
            <p className="text-lg">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </p>
            <p className="text-sm text-slate-500 mt-2">{user?.profile?.phone || 'No phone'}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Your Role</h3>
          <p className="text-xl font-bold text-indigo-600">{user?.roles.join(', ')}</p>
          <p className="text-sm text-slate-500 mt-2">Current permissions</p>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <p className="font-medium">View Profile</p>
            <p className="text-sm text-slate-500 mt-1">Update your information</p>
          </button>
          <button className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <p className="font-medium">Settings</p>
            <p className="text-sm text-slate-500 mt-1">Configure preferences</p>
          </button>
          {(isSuperAdmin() || isCoordinator()) && (
            <button className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-slate-500 mt-1">View and edit users</p>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
