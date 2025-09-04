import type { UserRepository } from '@/domain/repositories/UserRepository'
import type { User, UserPreferences } from '@/domain/entities/User'

export class ApiUserRepository implements UserRepository {
  constructor(private apiClient: ApiClient) {}

  async findById(id: string): Promise<User | null> {
    try {
      const response = await this.apiClient.get<User>(`/users/${id}`)
      return response
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null
      }
      throw error
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const response = await this.apiClient.get<User>(
        `/users/by-email/${encodeURIComponent(email)}`
      )
      return response
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null
      }
      throw error
    }
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return await this.apiClient.post<User>('/users', userData)
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    return await this.apiClient.put<User>(`/users/${id}`, userData)
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/users/${id}`)
  }

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      return await this.apiClient.get<UserPreferences>(`/users/${userId}/preferences`)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null
      }
      throw error
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    return await this.apiClient.put<UserPreferences>(`/users/${userId}/preferences`, preferences)
  }
}

interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, data: unknown): Promise<T>
  put<T>(path: string, data: unknown): Promise<T>
  delete(path: string): Promise<void>
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
