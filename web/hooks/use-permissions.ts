import { useAuthStore } from '@/stores'
import { RoleName } from '@/types'

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user)

  const hasRole = (role: RoleName): boolean => {
    if (!user) return false
    return user.roles.includes(role)
  }

  const hasAnyRole = (roles: RoleName[]): boolean => {
    if (!user) return false
    return roles.some((role) => user.roles.includes(role))
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    return user.permissions.includes(permission)
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false
    return permissions.every((permission) => user.permissions.includes(permission))
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false
    return permissions.some((permission) => user.permissions.includes(permission))
  }

  const isSuperAdmin = (): boolean => {
    return hasRole('SUPER_ADMIN')
  }

  const isCoordinator = (): boolean => {
    return hasRole('COORDINATOR')
  }

  const isCaregiver = (): boolean => {
    return hasRole('CAREGIVER')
  }

  const isPatient = (): boolean => {
    return hasRole('PATIENT')
  }

  return {
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isSuperAdmin,
    isCoordinator,
    isCaregiver,
    isPatient,
  }
}
