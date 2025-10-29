export interface ApiError {
  statusCode: number
  message: string
  errors?: ValidationError[]
  timestamp: string
  path: string
  correlationId?: string
}

export interface ValidationError {
  field: string
  message: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
