import type { User, UserPreferences } from '@/domain/entities/User'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  update(id: string, userData: Partial<User>): Promise<User>
  delete(id: string): Promise<void>
  getPreferences(userId: string): Promise<UserPreferences | null>
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>
}
