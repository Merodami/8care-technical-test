export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COORDINATOR: 'COORDINATOR',
  CAREGIVER: 'CAREGIVER',
  PATIENT: 'PATIENT',
} as const

export const PERMISSIONS = {
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  PROFILES_READ: 'profiles.read',
  PROFILES_UPDATE: 'profiles.update',
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  AUDIT_READ: 'audit.read',
} as const
