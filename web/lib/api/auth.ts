import apiClient from './client'
import {
  AuthResponse,
  PartialAuthResponse,
  LoginCredentials,
  RegisterData,
  OTPVerificationData,
  User,
} from '@/types'

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse | PartialAuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },

  loginWithOTP: async (data: OTPVerificationData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/verify', data)
    return response.data
  },

  register: async (data: RegisterData): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/verify-email', { token })
    return response.data
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/resend-verification', { email })
    return response.data
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/reset-password', { token, password })
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  refreshToken: async (): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh')
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  loginWithGoogle: () => {
    window.location.href = `${apiClient.defaults.baseURL}/auth/google`
  },

  loginWithGitHub: () => {
    window.location.href = `${apiClient.defaults.baseURL}/auth/github`
  },

  resendOTP: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/otp/resend')
    return response.data
  },
}
