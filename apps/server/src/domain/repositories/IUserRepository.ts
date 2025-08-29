import { User } from '../entities'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(user: User): Promise<User>
  update(user: User): Promise<User>
  delete(id: string): Promise<void>
  findAll(limit?: number, offset?: number): Promise<User[]>
  existsByEmail(email: string): Promise<boolean>
  count(): Promise<number>
}