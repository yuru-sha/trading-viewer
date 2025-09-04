import type { UserRepository } from '@/domain/repositories/UserRepository'
import type { User } from '@/domain/entities/User'

export type AuthenticateUserRequest = {
  email: string
  password: string
}

export type AuthenticateUserResponse = {
  user: User
  token: string
}

export class AuthenticateUser {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService
  ) {}

  async execute(request: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    const user = await this.userRepository.findByEmail(request.email)

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials')
    }

    const isPasswordValid = await this.authService.verifyPassword(request.password, user.id)

    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    const token = await this.authService.generateToken(user.id)

    return {
      user,
      token,
    }
  }
}

interface AuthService {
  verifyPassword(password: string, userId: string): Promise<boolean>
  generateToken(userId: string): Promise<string>
}
