import apiClient from './client'
import { User, PaginatedResponse, Profile } from '@/types'

export interface QueryUsersParams {
  page?: number
  limit?: number
  role?: string
  search?: string
  isActive?: boolean
}

export interface CreateUserData {
  email: string
  profile: Omit<
    Profile,
    | 'id'
    | 'userId'
    | 'avatarUrl'
    | 'address'
    | 'dateOfBirth'
    | 'caregiverProfile'
    | 'patientProfile'
    | 'coordinatorProfile'
  >
}

export const usersAPI = {
  getUsers: async (params?: QueryUsersParams): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users', { params })
    return response.data
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post('/users', data)
    return response.data
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch(`/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}
