import { useAuthStore } from '@/stores'

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    pendingOTP,
    login,
    loginWithOTP,
    loginWithGoogle,
    loginWithGitHub,
    register,
    logout,
    refreshUser,
  } = useAuthStore()

  return {
    user,
    isAuthenticated,
    isLoading,
    pendingOTP,
    login,
    loginWithOTP,
    loginWithGoogle,
    loginWithGitHub,
    register,
    logout,
    refreshUser,
  }
}
