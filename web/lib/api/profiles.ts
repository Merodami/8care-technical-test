import apiClient from './client'
import { User } from '@/types'

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  dateOfBirth?: string
  avatarUrl?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface ToggleOTPResponse {
  message: string
  otpEnabled: boolean
}

export interface UnlinkProviderResponse {
  message: string
}

export const profilesAPI = {
  getMyProfile: async (): Promise<User> => {
    const response = await apiClient.get('/profiles/me')
    return response.data
  },

  updateMyProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await apiClient.patch('/profiles/me', data)
    return response.data
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await apiClient.post('/profiles/me/change-password', data)
    return response.data
  },

  toggleOTP: async (enable: boolean): Promise<ToggleOTPResponse> => {
    const response = await apiClient.post('/profiles/me/otp/toggle', { enable })
    return response.data
  },

  unlinkProvider: async (provider: string): Promise<UnlinkProviderResponse> => {
    const response = await apiClient.delete(`/profiles/me/providers/${provider}`)
    return response.data
  },

  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/profiles/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
